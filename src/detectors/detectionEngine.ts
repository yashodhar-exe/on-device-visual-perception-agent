/**
 * detectionEngine.ts
 *
 * STEP 5 & 6 — The orchestrator.
 *
 * Runs all detectors in sequence:
 *  1. DOM scan → input fields (passwords, names, emails by type/autocomplete)
 *  2. Regex scan → every text node
 *  3. NER scan → names, addresses
 *  4. Face detection → img elements
 *  5. OCR → non-DOM visual areas (canvas, images with text)
 *
 * Returns a deduplicated list of DetectedItem with full location info.
 */

import { DetectedItem, DetectionType, PLACEHOLDER_MAP } from '../core/types';
import { generateId } from '../core/utils';
import { collectDomNodes, buildLocationInfo, DomNode } from './domScanner';
import { runAllPatterns } from './regexDetector';
import { runNer, detectNameFromElement } from './nerDetector';
import { detectAllFacesOnPage } from './faceDetector';

// ─── Engine ───────────────────────────────────────────────────────────────────

export class DetectionEngine {
  private items: DetectedItem[] = [];
  private seenValues = new Set<string>();

  async run(): Promise<DetectedItem[]> {
    this.items = [];
    this.seenValues = new Set();

    // Step 1 & 2: DOM scan
    const domNodes = collectDomNodes();
    this.processDomNodes(domNodes);

    // Step 3: NER scan on all text
    this.processNer(domNodes);

    // Step 4: Face detection (CV)
    await this.processFaces();

    return this.deduplicate();
  }

  // ─── DOM node processing ────────────────────────────────────────────────────

  private processDomNodes(nodes: DomNode[]) {
    for (const node of nodes) {
      // Password fields — detected by type
      if (node.inputType === 'password') {
        this.addItem({
          type: 'PASSWORD',
          value: node.text || '••••••••',
          confidence: 1.0,
          method: 'dom',
          location: node.location,
        });
        continue;
      }

      // Name fields — detected by autocomplete/name/id attributes
      if (node.isInput && detectNameFromElement(node.element)) {
        if (node.text) {
          this.addItem({
            type: 'NAME',
            value: node.text,
            confidence: 0.88,
            method: 'dom',
            location: node.location,
          });
        }
      }

      // Run regex on all text
      if (node.text) {
        const regexMatches = runAllPatterns(node.text);
        for (const match of regexMatches) {
          this.addItem({
            type: match.type,
            value: match.value,
            confidence: this.getRegexConfidence(match.type),
            method: 'regex',
            location: node.location,
          });
        }
      }
    }
  }

  // ─── NER processing ─────────────────────────────────────────────────────────

  private processNer(nodes: DomNode[]) {
    // Aggregate all text for NER (more context = better accuracy)
    const allText = nodes.map((n) => n.text).join('\n');
    const nerMatches = runNer(allText);

    // For NER matches, find the DOM node that contains each value
    for (const match of nerMatches) {
      const hostNode = nodes.find((n) => n.text.includes(match.value));
      if (!hostNode) continue;

      this.addItem({
        type: match.type,
        value: match.value,
        confidence: match.confidence,
        method: 'ner',
        location: hostNode.location,
      });
    }
  }

  // ─── Face detection ─────────────────────────────────────────────────────────

  private async processFaces() {
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
      // Face detection is best-effort
    }
  }

  // ─── Add item (with dedup) ──────────────────────────────────────────────────

  private addItem(partial: {
    type: DetectionType;
    value: string;
    confidence: number;
    method: DetectedItem['method'];
    location: DetectedItem['location'];
  }) {
    const key = `${partial.type}:${partial.value}`;
    if (this.seenValues.has(key)) return;
    this.seenValues.add(key);

    const item: DetectedItem = {
      id: generateId(),
      type: partial.type,
      value: partial.value,
      placeholder: PLACEHOLDER_MAP[partial.type],
      confidence: partial.confidence,
      method: partial.method,
      status: 'detected',
      location: partial.location,
      timestamp: Date.now(),
    };

    this.items.push(item);
  }

  // ─── Remove items that are substrings of longer matches ───────────────────

  private deduplicate(): DetectedItem[] {
    return this.items.filter((item) => {
      return !this.items.some(
        (other) =>
          other.id !== item.id &&
          other.type === item.type &&
          other.value.includes(item.value) &&
          other.value !== item.value
      );
    });
  }

  // ─── Confidence by detection method / type ──────────────────────────────────

  private getRegexConfidence(type: DetectionType): number {
    const highConfidence: DetectionType[] = [
      'EMAIL', 'CARD', 'OPENAI_KEY', 'ANTHROPIC_KEY', 'GITHUB_TOKEN',
      'GOOGLE_KEY', 'JWT_SECRET', 'STRIPE_KEY', 'RAZORPAY_KEY',
      'MONGODB_URL', 'POSTGRES_URL', 'MYSQL_URL', 'REDIS_URL', 'AWS_KEY',
    ];
    if (highConfidence.includes(type)) return 0.98;
    return 0.85;
  }
}
