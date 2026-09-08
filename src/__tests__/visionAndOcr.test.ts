/**
 * visionAndOcr.test.ts
 *
 * Tests for Vision Engine & OCR:
 * - WebGPU / WASM / CPU backend fallback detection
 * - IoU bounding box calculations and deduplication
 * - UI element classification logic
 * - OCR engine instantiation and fallback
 */

import { VisionModel } from '../vision/visionModel';
import { computeIoU, deduplicateVisualElements } from '../vision/elementClassifier';
import { OcrEngine } from '../ocr/ocrEngine';
import { VisualElement } from '../core/types';

describe('Vision & OCR Subsystems', () => {
  describe('VisionModel Backend Negotiation', () => {
    it('initializes and reports a valid backend (webgpu | wasm | cpu)', async () => {
      const model = new VisionModel();
      const backend = await model.init();
      expect(['webgpu', 'wasm', 'cpu']).toContain(backend);
      expect(model.getBackend()).toBe(backend);
    });

    it('classifies DOM elements into visual types', async () => {
      const model = new VisionModel();
      await model.init();

      const mockImageData = {
        width: 800,
        height: 600,
        data: new Uint8ClampedArray(800 * 600 * 4),
      } as unknown as ImageData;

      const elements = await model.classify(mockImageData, [
        { tagName: 'FORM', rect: { x: 50, y: 50, width: 300, height: 200 } },
        { tagName: 'BUTTON', rect: { x: 60, y: 210, width: 100, height: 40 } },
        { tagName: 'CANVAS', rect: { x: 400, y: 50, width: 350, height: 250 } },
        { tagName: 'PRE', rect: { x: 50, y: 300, width: 500, height: 100 } },
      ]);

      expect(elements).toHaveLength(4);
      expect(elements.map((e) => e.type)).toEqual(['form', 'button', 'chart', 'code']);
      expect(elements[0].boundingBox.width).toBe(300);
    });
  });

  describe('IoU & Element Classification Helpers', () => {
    it('computes IoU correctly for identical, overlapping, and disjoint boxes', () => {
      const boxA = { x: 0, y: 0, width: 100, height: 100 };
      const boxB = { x: 0, y: 0, width: 100, height: 100 };
      const boxC = { x: 50, y: 0, width: 100, height: 100 };
      const boxD = { x: 200, y: 200, width: 50, height: 50 };

      // Identical boxes -> IoU = 1.0
      expect(computeIoU(boxA, boxB)).toBeCloseTo(1.0);

      // Overlapping: intersection = 50 * 100 = 5000; union = 10000 + 10000 - 5000 = 15000; IoU = 5000 / 15000 = 1/3
      expect(computeIoU(boxA, boxC)).toBeCloseTo(1 / 3);

      // Disjoint boxes -> IoU = 0
      expect(computeIoU(boxA, boxD)).toBe(0);
    });

    it('deduplicates overlapping elements of the same type', () => {
      const elements: VisualElement[] = [
        { type: 'button', boundingBox: { x: 10, y: 10, width: 100, height: 40 }, confidence: 0.95 },
        { type: 'button', boundingBox: { x: 12, y: 10, width: 98, height: 40 }, confidence: 0.80 },
        { type: 'form', boundingBox: { x: 10, y: 10, width: 100, height: 40 }, confidence: 0.90 },
      ];

      const deduped = deduplicateVisualElements(elements, 0.5);
      // Both button and form kept, but duplicate lower-confidence button removed
      expect(deduped).toHaveLength(2);
      expect(deduped.find((e) => e.type === 'button')?.confidence).toBe(0.95);
    });
  });

  describe('OcrEngine', () => {
    it('instantiates and handles missing Tesseract gracefully without throwing', async () => {
      const engine = new OcrEngine('eng');
      const results = await engine.extractText('data:image/png;base64,invalid');
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
