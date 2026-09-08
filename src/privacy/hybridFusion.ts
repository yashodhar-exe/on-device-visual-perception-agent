/**
 * hybridFusion.ts
 *
 * Hybrid Multi-Modal Detection Fusion Engine:
 * Combines detections from 5 layers:
 *  1. DOM Scanner (form inputs, attributes, autocomplete)
 *  2. Regex Engine (Luhn-validated cards, emails, phones, tokens, Aadhaar, PAN, IFSC)
 *  3. Local ONNX NER (transformers BERT entity extraction)
 *  4. Local OCR (Tesseract text & coordinates from canvas/images)
 *  5. Local Computer Vision Face Detection (face-api.js)
 *
 * Merges duplicate and overlapping detections (IoU > 0.4) into a unified
 * SensitiveRegion representation with enclosing bounding boxes.
 */

import {
  DetectedItem,
  OcrResult,
  VisualElement,
  SensitiveRegion,
  BoundingBox,
  DetectionType,
  DetectionMethod,
} from '../core/types';
import { runAllPatterns } from '../detectors/regexDetector';
import { generateId } from '../core/utils';
import { computeIoU, computeIntersectionArea } from '../vision/elementClassifier';
import { getSemanticPlaceholder } from '../sanitization/semanticPlaceholder';

/**
 * Computes enclosing bounding box that covers both box a and box b.
 */
export function computeEnclosingBox(a: BoundingBox, b: BoundingBox): BoundingBox {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Checks if one box is substantially contained inside another box (>70% containment).
 */
export function isSubstantiallyContained(inner: BoundingBox, outer: BoundingBox): boolean {
  const intersection = computeIntersectionArea(inner, outer);
  const innerArea = inner.width * inner.height;
  if (innerArea === 0) return false;
  return intersection / innerArea > 0.7;
}

/**
 * Type sensitivity priority: higher number means higher priority.
 */
const SENSITIVITY_WEIGHTS: Record<DetectionType, number> = {
  PASSWORD: 100,
  CARD: 95,
  AADHAAR: 90,
  PAN: 88,
  GOV_ID: 85,
  API_KEY: 80,
  OPENAI_KEY: 80,
  ANTHROPIC_KEY: 80,
  GITHUB_TOKEN: 80,
  GOOGLE_KEY: 80,
  JWT_SECRET: 80,
  AWS_KEY: 80,
  AZURE_KEY: 80,
  STRIPE_KEY: 80,
  RAZORPAY_KEY: 80,
  SUPABASE_KEY: 80,
  FIREBASE_CONFIG: 80,
  MONGODB_URL: 75,
  POSTGRES_URL: 75,
  MYSQL_URL: 75,
  REDIS_URL: 75,
  EMAIL: 70,
  PHONE: 65,
  FACE: 60,
  IFSC: 55,
  NAME: 50,
  ADDRESS: 45,
  OTHER: 10,
};

/**
 * Fuses all detections across DOM, Regex, NER, OCR, Face, and Vision.
 */
export function fuseDetections(
  domItems: DetectedItem[],
  ocrResults: OcrResult[] = [],
  visualElements: VisualElement[] = []
): SensitiveRegion[] {
  const candidateRegions: Array<{
    boundingBox: BoundingBox;
    type: DetectionType;
    confidence: number;
    source: DetectionMethod;
    valueSnippet?: string;
    semanticPlaceholder?: string;
  }> = [];

  // 1. Ingest DOM & Regex & NER items
  for (const item of domItems) {
    if (item.location?.boundingBox) {
      const placeholder =
        item.semanticPlaceholder ||
        getSemanticPlaceholder(item.type, undefined, undefined, item.location?.selector);
      candidateRegions.push({
        boundingBox: { ...item.location.boundingBox },
        type: item.type,
        confidence: item.confidence,
        source: item.method,
        valueSnippet: item.placeholder,
        semanticPlaceholder: placeholder,
      });
    }
  }

  // 2. Ingest OCR items: run regex detection on OCR text to find PII in rendered images/canvases
  for (const ocr of ocrResults) {
    if (!ocr.text || ocr.text.length < 3) continue;

    const patternMatches = runAllPatterns(ocr.text);
    if (patternMatches.length > 0) {
      for (const match of patternMatches) {
        candidateRegions.push({
          boundingBox: { ...ocr.boundingBox },
          type: match.type,
          confidence: match.confidence,
          source: 'ocr',
          valueSnippet: `[OCR_${match.type}]`,
          semanticPlaceholder: getSemanticPlaceholder(match.type, ocr.text),
        });
      }
    }
  }

  if (candidateRegions.length === 0) {
    return [];
  }

  // 3. Cluster and fuse overlapping regions (IoU > 0.4 or containment > 70%)
  const fusedRegions: SensitiveRegion[] = [];
  const processed = new Set<number>();

  for (let i = 0; i < candidateRegions.length; i++) {
    if (processed.has(i)) continue;
    processed.add(i);

    let clusterBox = { ...candidateRegions[i].boundingBox };
    let bestType = candidateRegions[i].type;
    let maxConfidence = candidateRegions[i].confidence;
    const sources = new Set<DetectionMethod>([candidateRegions[i].source]);
    let valueSnippet = candidateRegions[i].valueSnippet;

    let semanticPlaceholder = candidateRegions[i].semanticPlaceholder;

    for (let j = i + 1; j < candidateRegions.length; j++) {
      if (processed.has(j)) continue;

      const other = candidateRegions[j];
      const iou = computeIoU(clusterBox, other.boundingBox);
      const isContained =
        isSubstantiallyContained(other.boundingBox, clusterBox) ||
        isSubstantiallyContained(clusterBox, other.boundingBox);

      // Merge if overlapping or contained
      if (iou > 0.4 || isContained) {
        processed.add(j);
        clusterBox = computeEnclosingBox(clusterBox, other.boundingBox);
        sources.add(other.source);
        maxConfidence = Math.max(maxConfidence, other.confidence);

        // Priority type resolution
        if (
          (SENSITIVITY_WEIGHTS[other.type] ?? 0) >
          (SENSITIVITY_WEIGHTS[bestType] ?? 0)
        ) {
          bestType = other.type;
          valueSnippet = other.valueSnippet;
          semanticPlaceholder = other.semanticPlaceholder;
        }
      }
    }

    fusedRegions.push({
      id: generateId(),
      boundingBox: clusterBox,
      sources: Array.from(sources),
      type: bestType,
      confidence: Math.round(maxConfidence * 100) / 100,
      valueSnippet,
      redacted: false,
      semanticPlaceholder: semanticPlaceholder || getSemanticPlaceholder(bestType),
    });
  }

  return fusedRegions;
}
