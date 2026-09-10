/**
 * detectionEngine.ts
 *
 * The detection engine orchestrator.
 *
 * Runs all detectors in sequence:
 *  1. DOM scan → editable input fields (passwords, emails, phone, card by type/autocomplete)
 *  2. Regex scan → high-precision token and PII matching + Luhn check
 *  3. NER scan → ONNX transformer model + structured street address format
 *  4. Face detection → img elements
 *
 * Filters all candidates against allowlist.ts to eliminate false positives on
 * company names, framework names, UI labels, and buttons.
 * Deduplicates overlapping detections and calculates risk score strictly from validated items.
 */

import { DetectedItem, DetectionType, OcrResult, PLACEHOLDER_MAP, ScanMetrics, ContentProvenance } from '../core/types';
import { generateId } from '../core/utils';
import { collectDomNodes, collectDomNodesInRoots, DomNode, getTextMatchBoundingBox } from './domScanner';
import { runAllPatterns } from './regexDetector';
import { runNer, detectNameFromElement } from './nerDetector';
import { detectAllFacesOnPage, detectFacesInImage, detectFacesInScreenshot } from './faceDetector';
import { isAllowlisted } from './allowlist';
import {
  getSemanticPlaceholder,
  extractVariableNameFromContext,
  sanitizeContextString,
} from '../sanitization/semanticPlaceholder';
import { OcrEngine } from '../ocr/ocrEngine';

function isPasswordInput(el: Element): boolean {
  if (!el || el.tagName !== 'INPUT') return false;
  const input = el as HTMLInputElement;
  if (input.type === 'password') return true;
  const autocomplete = (input.getAttribute('autocomplete') ?? '').toLowerCase();
  if (autocomplete.includes('password')) return true;
  const nameId = (input.name || input.id || '').toLowerCase();
  if (nameId.includes('password') || nameId === 'pass' || nameId === 'pwd') return true;
  return false;
}

function isGoogleOrUiChip(el: Element): boolean {
  if (!el || !el.closest) return false;
  return (
    el.closest(
      '.gsi-material-button, [class*="gsi" i], [aria-label*="Sign in with Google" i], iframe[src*="google"]'
    ) !== null
  );
}

export class DetectionEngine {
  private items: DetectedItem[] = [];
  private seenKeys = new Set<string>();

  /** Full-page scan. */
  async run(): Promise<DetectedItem[]> {
    return (await this.runWithMetrics()).items;
  }

  /** Full-page scan with timing metrics. */
  async runWithMetrics(): Promise<{ items: DetectedItem[]; timing: Omit<ScanMetrics, 'overlayRenderMs' | 'totalMs'> }> {
    this.items = [];
    this.seenKeys = new Set();

    const t0 = performance.now();
    const domNodes = collectDomNodes();
    this.processDomNodes(domNodes);
    const domScanMs = Math.round((performance.now() - t0) * 10) / 10;

    const t1 = performance.now();
    const regexMs = domScanMs;

    const t2 = performance.now();
    await this.processNer(domNodes);
    const nerMs = Math.round((performance.now() - t2) * 10) / 10;

    const t3 = performance.now();
    await this.processFaces(null);
    const faceMs = Math.round((performance.now() - t3) * 10) / 10;

    void t1;

    const validatedItems = this.deduplicateAndValidate();

    return {
      items: validatedItems,
      timing: { domScanMs, regexMs, nerMs, ocrMs: 0, faceMs },
    };
  }

  /**
   * Incremental scan — only process DOM nodes within the provided root elements.
   */
  async runOnRoots(roots: Element[]): Promise<DetectedItem[]> {
    this.items = [];
    this.seenKeys = new Set();

    const domNodes = collectDomNodesInRoots(roots);
    this.processDomNodes(domNodes);
    await this.processNer(domNodes);

    const images = roots.flatMap((root) =>
      Array.from(root.querySelectorAll<HTMLImageElement>('img')).filter(
        (img) => img.complete && img.naturalWidth >= 60 && img.getBoundingClientRect().height >= 60
      )
    );
    await this.processFacesFromImages(images);

    return this.deduplicateAndValidate();
  }

  /**
   * Full-page scan with screenshot-based OCR and face detection.
   * Runs all DOM/regex/NER detectors, then additionally runs OCR and face
   * detection on the provided screenshot image.
   */
  async runWithScreenshot(screenshotDataUrl: string): Promise<{
    items: DetectedItem[];
    timing: Omit<ScanMetrics, 'overlayRenderMs' | 'totalMs'>;
    ocrResults: OcrResult[];
  }> {
    this.items = [];
    this.seenKeys = new Set();

    const t0 = performance.now();
    const domNodes = collectDomNodes();
    this.processDomNodes(domNodes);
    const domScanMs = Math.round((performance.now() - t0) * 10) / 10;

    const regexMs = domScanMs;

    const t2 = performance.now();
    await this.processNer(domNodes);
    const nerMs = Math.round((performance.now() - t2) * 10) / 10;

    // OCR on captured screenshot
    const t4 = performance.now();
    const ocrResults = await this.processOcr(screenshotDataUrl);
    const ocrMs = Math.round((performance.now() - t4) * 10) / 10;

    // Face detection: DOM images + screenshot
    const t3 = performance.now();
    await this.processFaces(null);
    await this.processScreenshotFaces(screenshotDataUrl);
    const faceMs = Math.round((performance.now() - t3) * 10) / 10;

    const validatedItems = this.deduplicateAndValidate();

    console.debug(
      `[PrivacyFirewall] Detection complete: ${validatedItems.length} items, ` +
      `OCR=${ocrResults.length} results, Face detection ran on screenshot`
    );

    return {
      items: validatedItems,
      timing: { domScanMs, regexMs, nerMs, ocrMs, faceMs },
      ocrResults,
    };
  }

  // ─── DOM node & Regex processing ──────────────────────────────────────────

  private processDomNodes(nodes: DomNode[]) {
    for (const node of nodes) {
      if (!node.text && !node.isInput) continue;

      // 1. Password input fields — MUST be an actual input node!
      if (node.isInput && isPasswordInput(node.element)) {
        this.addItem({
          type: 'PASSWORD',
          value: node.text || '••••••••',
          confidence: 1.0,
          method: 'dom',
          location: node.location,
          context: node.text,
          variableName: 'PASSWORD',
          provenance: node.provenance,
        });
        continue;
      }

      // Skip static text inside Google Sign-in chips or labels
      if (!node.isInput && isGoogleOrUiChip(node.element)) {
        continue;
      }

      // 2. Email input fields — explicit type or input match
      if (node.isInput && (node.inputType === 'email' || node.element.getAttribute('autocomplete')?.includes('email'))) {
        if (node.text && !isAllowlisted(node.text)) {
          this.addItem({
            type: 'EMAIL',
            value: node.text,
            confidence: 0.98,
            method: 'dom',
            location: node.location,
            context: node.text,
            variableName: 'EMAIL',
            provenance: node.provenance,
          });
        }
      }

      // 3. Name input fields — explicit attribute match
      if (node.isInput && detectNameFromElement(node.element)) {
        if (node.text && !isAllowlisted(node.text)) {
          this.addItem({
            type: 'NAME',
            value: node.text,
            confidence: 0.88,
            method: 'dom',
            location: node.location,
            context: node.text,
            variableName: 'NAME',
            provenance: node.provenance,
          });
        }
      }

      // 4. Run Regex matcher on all scannable text content
      if (node.text) {
        const regexMatches = runAllPatterns(node.text);
        for (const match of regexMatches) {
          // Never classify static non-input text as PASSWORD
          if (match.type === 'PASSWORD' && !node.isInput) continue;
          if (isAllowlisted(match.value)) continue;

          const line = node.text.split('\n').find((l) => l.includes(match.value)) || node.text;
          let varName = extractVariableNameFromContext(line, match.value);
          if (!varName && node.isInput) {
            const attr = node.element.getAttribute('name') || node.element.id;
            if (attr) varName = attr;
          }

          let location = node.location;
          if (!node.isInput && typeof document !== 'undefined') {
            const rangeBox = getTextMatchBoundingBox(node.element, match.value);
            if (rangeBox && rangeBox.width > 0 && rangeBox.height > 0) {
              location = {
                ...node.location,
                boundingBox: rangeBox,
              };
            }
          }

          this.addItem({
            type: match.type,
            value: match.value,
            confidence: match.confidence,
            method: 'regex',
            location,
            context: line,
            variableName: varName || undefined,
            provenance: node.provenance,
          });
        }
      }
    }
  }

  // ─── NER processing (ONNX model + structured addresses) ───────────────────

  private async processNer(nodes: DomNode[]) {
    for (const node of nodes) {
      if (!node.text || node.text.length < 6) continue;
      if (!node.isInput && isGoogleOrUiChip(node.element)) continue;

      const nerMatches = await runNer(node.text);
      for (const match of nerMatches) {
        if (match.type === 'PASSWORD' && !node.isInput) continue;
        if (isAllowlisted(match.value)) continue;

        const line = node.text.split('\n').find((l) => l.includes(match.value)) || node.text;
        const varName = extractVariableNameFromContext(line, match.value);

        let location = node.location;
        if (!node.isInput && typeof document !== 'undefined') {
          const rangeBox = getTextMatchBoundingBox(node.element, match.value);
          if (rangeBox && rangeBox.width > 0 && rangeBox.height > 0) {
            location = {
              ...node.location,
              boundingBox: rangeBox,
            };
          }
        }

        this.addItem({
          type: match.type,
          value: match.value,
          confidence: match.confidence,
          method: 'ner',
          location,
          context: line,
          variableName: varName || undefined,
          provenance: node.provenance,
        });
      }
    }
  }

  // ─── Face detection ────────────────────────────────────────────────────────

  private async processFaces(_roots: null) {
    try {
      const faces = await detectAllFacesOnPage();
      for (const face of faces) {
        this.addItem({
          type: 'FACE',
          value: '[face]',
          confidence: face.confidence,
          method: 'cv',
          location: { boundingBox: face.boundingBox, pageLabel: 'Image' },
        });
      }
    } catch {
      // Best effort
    }
  }

  private async processFacesFromImages(images: HTMLImageElement[]) {
    try {
      for (const img of images) {
        const faces = await detectFacesInImage(img);
        for (const face of faces) {
          this.addItem({
            type: 'FACE',
            value: '[face]',
            confidence: face.confidence,
            method: 'cv',
            location: { boundingBox: face.boundingBox, pageLabel: 'Image' },
          });
        }
      }
    } catch {
      // Best effort
    }
  }

  // ─── OCR processing on screenshot ─────────────────────────────────────────

  private async processOcr(screenshotDataUrl: string): Promise<OcrResult[]> {
    try {
      console.debug('[PrivacyFirewall] OCR detector invoked');
      const engine = new OcrEngine();
      const ocrResults = await engine.extractText(screenshotDataUrl);
      console.debug(`[PrivacyFirewall] OCR detection count: ${ocrResults.length}`);

      // Run regex patterns on each OCR text to classify PII
      for (const ocr of ocrResults) {
        if (!ocr.text || ocr.text.length < 3) continue;

        const matches = runAllPatterns(ocr.text);
        for (const match of matches) {
          if (isAllowlisted(match.value)) continue;

          this.addItem({
            type: match.type,
            value: match.value,
            confidence: Math.min(match.confidence, ocr.confidence),
            method: 'ocr',
            location: {
              boundingBox: ocr.boundingBox,
              pageLabel: 'OCR',
            },
          });
        }
      }

      return ocrResults;
    } catch (err) {
      console.warn('[PrivacyFirewall] OCR processing failed:', err);
      return [];
    }
  }

  // ─── Face detection on screenshot ─────────────────────────────────────────

  private async processScreenshotFaces(screenshotDataUrl: string): Promise<void> {
    try {
      console.debug('[PrivacyFirewall] Screenshot face detector invoked');
      const faces = await detectFacesInScreenshot(screenshotDataUrl);
      console.debug(`[PrivacyFirewall] Screenshot face detection count: ${faces.length}`);
      for (const face of faces) {
        this.addItem({
          type: 'FACE',
          value: '[face]',
          confidence: face.confidence,
          method: 'cv',
          location: { boundingBox: face.boundingBox, pageLabel: 'Screenshot' },
        });
      }
    } catch {
      // Best effort — screenshot face detection is optional
    }
  }


  private addItem(partial: {
    type: DetectionType;
    value: string;
    confidence: number;
    method: DetectedItem['method'];
    location: DetectedItem['location'];
    context?: string;
    variableName?: string;
    semanticPlaceholder?: string;
    provenance?: ContentProvenance;
  }) {
    if (!partial.value || partial.confidence < 0.60) return;
    if (partial.value !== '[face]' && partial.value !== '••••••••' && isAllowlisted(partial.value)) return;

    // Deduplicate by type + element selector / location
    const selectorKey = partial.location.selector || partial.location.xpath || 'unknown';
    const key = `${partial.type}:${selectorKey}:${partial.value}`;
    if (this.seenKeys.has(key)) return;
    this.seenKeys.add(key);

    const varName =
      partial.variableName ||
      (partial.context ? extractVariableNameFromContext(partial.context, partial.value) : undefined);

    const semanticVal = getSemanticPlaceholder(
      partial.type,
      partial.context,
      varName || undefined
    );

    // Context-preserving semantic placeholder:
    // If context has variable assignment (e.g. "VAR=VALUE"), full placeholder is "VAR=YOUR_VAR"
    // For standalone items with no surrounding variable name, it's just "YOUR_JWT_TOKEN", etc.
    const fullPlaceholder =
      partial.semanticPlaceholder ||
      (varName ? `${varName}=${semanticVal}` : semanticVal);

    const item: DetectedItem = {
      id: generateId(),
      type: partial.type,
      value: partial.value,
      placeholder: fullPlaceholder,
      semanticPlaceholder: fullPlaceholder,
      confidence: partial.confidence,
      method: partial.method,
      status: 'detected',
      location: partial.location,
      timestamp: Date.now(),
      variableName: varName || undefined,
      provenance: partial.provenance || 'UNKNOWN',
    };

    this.items.push(item);
  }

  // ─── Deduplicate and Validate ──────────────────────────────────────────────

  private deduplicateAndValidate(): DetectedItem[] {
    return this.items.filter((item) => {
      // Reject any match in allowlist
      if (item.value !== '[face]' && item.value !== '••••••••' && isAllowlisted(item.value)) {
        return false;
      }

      const hasBetterMatch = this.items.some((other) => {
        if (other.id === item.id) return false;

        // Same selector & type, but other has higher confidence
        if (
          other.type === item.type &&
          other.location.selector === item.location.selector &&
          other.confidence > item.confidence
        ) {
          return true;
        }

        // Substring check on same detector type
        if (
          other.type === item.type &&
          other.value.includes(item.value) &&
          other.value.length > item.value.length &&
          other.confidence >= item.confidence
        ) {
          return true;
        }

        return false;
      });

      return !hasBetterMatch;
    });
  }
}
