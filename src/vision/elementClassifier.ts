/**
 * elementClassifier.ts
 *
 * Visual Element Classifier:
 * Refines raw visual detections and classifies page elements
 * to assist the VLM action planner in understanding page composition.
 */

import { VisualElement, BoundingBox } from '../core/types';

/**
 * Calculates bounding-box overlap area between two boxes.
 */
export function computeIntersectionArea(a: BoundingBox, b: BoundingBox): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
}

/**
 * Calculates IoU (Intersection-over-Union) between two bounding boxes.
 */
export function computeIoU(a: BoundingBox, b: BoundingBox): number {
  const intersection = computeIntersectionArea(a, b);
  if (intersection === 0) return 0;
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const union = areaA + areaB - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Filter duplicate or heavily overlapping visual elements of the same type.
 */
export function deduplicateVisualElements(elements: VisualElement[], iouThreshold = 0.5): VisualElement[] {
  const sorted = [...elements].sort((a, b) => b.confidence - a.confidence);
  const kept: VisualElement[] = [];

  for (const item of sorted) {
    const isDuplicate = kept.some(
      (existing) =>
        existing.type === item.type &&
        computeIoU(existing.boundingBox, item.boundingBox) > iouThreshold
    );

    if (!isDuplicate) {
      kept.push(item);
    }
  }

  return kept;
}
