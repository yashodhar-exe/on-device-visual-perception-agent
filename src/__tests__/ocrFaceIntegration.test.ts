/**
 * ocrFaceIntegration.test.ts
 *
 * Integration tests verifying that OCR and face detection results
 * are properly wired into the hybrid fusion → redaction pipeline.
 *
 * Test matrix:
 *  A. OCR results reach fuseDetections and produce SensitiveRegions
 *  B. Face results reach fuseDetections and produce SensitiveRegions
 *  C. OCR-only sensitive text is detected and fused
 *  D. Face in screenshot produces a FACE-type SensitiveRegion
 *  E. DOM/regex/NER detection continues working
 *  F. OCR failure → pipeline continues
 *  G. Face detection failure → pipeline continues
 *  H. Existing privacy/policy tests unaffected (run separately)
 */

import { fuseDetections } from '../privacy/hybridFusion';
import { evaluatePrivacyPolicy } from '../privacy/policyEngine';
import { sanitizeOcrResults, sanitizeOcrText } from '../ocr/ocrEngine';
import {
  DetectedItem,
  OcrResult,
  SensitiveRegion,
  AnalyzeRequest,
} from '../core/types';

describe('OCR & Face Detection Integration', () => {
  // ─── A. OCR results reach fusion ───────────────────────────────────────────

  describe('OCR → Fusion Integration', () => {
    it('OCR results containing email produce a SensitiveRegion via fusion', () => {
      const ocrResults: OcrResult[] = [
        {
          text: 'user@example.com',
          confidence: 0.92,
          boundingBox: { x: 200, y: 100, width: 180, height: 25 },
        },
      ];

      const fused = fuseDetections([], ocrResults, []);

      expect(fused.length).toBeGreaterThanOrEqual(1);
      expect(fused[0].type).toBe('EMAIL');
      expect(fused[0].sources).toContain('ocr');
      expect(fused[0].boundingBox).toEqual(
        expect.objectContaining({ x: 200, y: 100 })
      );
    });

    it('OCR results containing phone number produce a SensitiveRegion', () => {
      const ocrResults: OcrResult[] = [
        {
          text: '+91 9876543210',
          confidence: 0.88,
          boundingBox: { x: 50, y: 200, width: 150, height: 20 },
        },
      ];

      const fused = fuseDetections([], ocrResults, []);
      expect(fused.length).toBeGreaterThanOrEqual(1);
      const phoneRegion = fused.find((r) => r.type === 'PHONE');
      expect(phoneRegion).toBeDefined();
      expect(phoneRegion!.sources).toContain('ocr');
    });

    it('OCR results with no PII text produce no SensitiveRegions', () => {
      const ocrResults: OcrResult[] = [
        {
          text: 'Hello World',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 100, height: 20 },
        },
      ];

      const fused = fuseDetections([], ocrResults, []);
      expect(fused).toHaveLength(0);
    });
  });

  // ─── B. Face results reach fusion ──────────────────────────────────────────

  describe('Face Detection → Fusion Integration', () => {
    it('Face detections from DOM items produce FACE SensitiveRegions', () => {
      const faceItems: DetectedItem[] = [
        {
          id: 'face-1',
          type: 'FACE',
          value: '[face]',
          placeholder: '[FACE_REDACTED]',
          confidence: 0.85,
          method: 'cv',
          status: 'detected',
          location: {
            boundingBox: { x: 300, y: 50, width: 80, height: 100 },
            pageLabel: 'Image',
          },
          timestamp: Date.now(),
        },
      ];

      const fused = fuseDetections(faceItems, [], []);

      expect(fused).toHaveLength(1);
      expect(fused[0].type).toBe('FACE');
      expect(fused[0].sources).toContain('cv');
      expect(fused[0].confidence).toBe(0.85);
    });
  });

  // ─── C. OCR-only sensitive text is fused and redactable ────────────────────

  describe('OCR-only PII Detection', () => {
    it('email visible only in OCR (not DOM) still gets fused into a region', () => {
      // No DOM items — email is only in the OCR text (e.g. rendered in a canvas)
      const ocrResults: OcrResult[] = [
        {
          text: 'contact: secret@company.org',
          confidence: 0.90,
          boundingBox: { x: 100, y: 300, width: 250, height: 30 },
        },
      ];

      const fused = fuseDetections([], ocrResults, []);
      expect(fused.length).toBeGreaterThanOrEqual(1);

      const emailRegion = fused.find((r) => r.type === 'EMAIL');
      expect(emailRegion).toBeDefined();
      expect(emailRegion!.sources).toContain('ocr');
    });
  });

  // ─── D. Face detection produces correct SensitiveRegion type ────────────────

  describe('Face Region Type', () => {
    it('face regions use the existing FACE DetectionType, not a custom type', () => {
      const faceItems: DetectedItem[] = [
        {
          id: 'face-screenshot-1',
          type: 'FACE',
          value: '[face]',
          placeholder: '[FACE_REDACTED]',
          confidence: 0.92,
          method: 'cv',
          status: 'detected',
          location: {
            boundingBox: { x: 120, y: 80, width: 60, height: 75 },
            pageLabel: 'Screenshot',
          },
          timestamp: Date.now(),
        },
      ];

      const fused = fuseDetections(faceItems, [], []);
      expect(fused).toHaveLength(1);
      expect(fused[0].type).toBe('FACE');
      // Verify the redacted flag is initially false
      expect(fused[0].redacted).toBe(false);
    });
  });

  // ─── E. DOM/regex/NER detection still works alongside OCR/face ─────────────

  describe('Existing Detectors Preserved', () => {
    it('DOM+regex items are fused correctly even when OCR results are present', () => {
      const domItems: DetectedItem[] = [
        {
          id: 'dom-email-1',
          type: 'EMAIL',
          value: 'test@example.com',
          placeholder: '[EMAIL]',
          confidence: 0.95,
          method: 'dom',
          status: 'detected',
          location: {
            boundingBox: { x: 50, y: 50, width: 200, height: 30 },
          },
          timestamp: Date.now(),
        },
        {
          id: 'ner-name-1',
          type: 'NAME',
          value: 'John Doe',
          placeholder: '[NAME]',
          confidence: 0.88,
          method: 'ner',
          status: 'detected',
          location: {
            boundingBox: { x: 50, y: 100, width: 120, height: 25 },
          },
          timestamp: Date.now(),
        },
      ];

      const ocrResults: OcrResult[] = [
        {
          text: '+1 555-123-4567',
          confidence: 0.85,
          boundingBox: { x: 400, y: 200, width: 160, height: 22 },
        },
      ];

      const fused = fuseDetections(domItems, ocrResults, []);

      // Should have at least 3 regions: email, name, phone
      expect(fused.length).toBeGreaterThanOrEqual(3);

      const types = fused.map((r) => r.type);
      expect(types).toContain('EMAIL');
      expect(types).toContain('NAME');
      expect(types).toContain('PHONE');

      // Verify DOM source preserved
      const emailRegion = fused.find((r) => r.type === 'EMAIL');
      expect(emailRegion!.sources).toContain('dom');

      // Verify OCR source preserved
      const phoneRegion = fused.find((r) => r.type === 'PHONE');
      expect(phoneRegion!.sources).toContain('ocr');
    });
  });

  // ─── F. OCR failure does not crash the pipeline ────────────────────────────

  describe('OCR Failure Resilience', () => {
    it('empty OCR results still allow DOM detections to fuse correctly', () => {
      const domItems: DetectedItem[] = [
        {
          id: 'dom-pass-1',
          type: 'PASSWORD',
          value: '••••••••',
          placeholder: '[PASSWORD]',
          confidence: 1.0,
          method: 'dom',
          status: 'detected',
          location: {
            boundingBox: { x: 50, y: 50, width: 200, height: 30 },
          },
          timestamp: Date.now(),
        },
      ];

      // OCR returned empty (as if Tesseract was unavailable)
      const fused = fuseDetections(domItems, [], []);
      expect(fused).toHaveLength(1);
      expect(fused[0].type).toBe('PASSWORD');
      expect(fused[0].sources).toContain('dom');
    });
  });

  // ─── G. Face detection failure does not crash the pipeline ─────────────────

  describe('Face Detection Failure Resilience', () => {
    it('pipeline works with zero face detections when face-api is unavailable', () => {
      const domItems: DetectedItem[] = [
        {
          id: 'dom-email-2',
          type: 'EMAIL',
          value: 'safe@user.com',
          placeholder: '[EMAIL]',
          confidence: 0.95,
          method: 'dom',
          status: 'detected',
          location: {
            boundingBox: { x: 100, y: 100, width: 200, height: 30 },
          },
          timestamp: Date.now(),
        },
      ];

      // No face items at all (face-api not loaded)
      const fused = fuseDetections(domItems, [], []);
      expect(fused).toHaveLength(1);
      expect(fused[0].type).toBe('EMAIL');
    });
  });

  // ─── OCR sanitization before network ───────────────────────────────────────

  describe('OCR Sanitization', () => {
    it('sanitizeOcrResults replaces PII in OCR text with placeholders', () => {
      const ocrResults: OcrResult[] = [
        {
          text: 'user@example.com',
          confidence: 0.90,
          boundingBox: { x: 10, y: 10, width: 100, height: 20 },
        },
      ];

      const sanitized = sanitizeOcrResults(ocrResults);
      expect(sanitized).toHaveLength(1);
      // Sanitized text should NOT contain the raw email
      expect(sanitized[0].text).not.toContain('user@example.com');
    });

    it('sanitizeOcrText replaces PII in raw text string', () => {
      const rawText = 'Contact: user@example.com or call +91 9876543210';
      const sanitized = sanitizeOcrText(rawText);
      expect(sanitized).not.toContain('user@example.com');
      expect(sanitized).not.toContain('9876543210');
    });
  });

  // ─── Policy engine accepts sanitized OCR text ──────────────────────────────

  describe('Privacy Policy with OCR', () => {
    it('policy passes when OCR text is sanitized', () => {
      const payload: AnalyzeRequest = {
        screenshot: 'data:image/png;base64,safeData',
        accessibilityTree: [],
        domStructure: '<form />',
        ocrText: 'Login [EMAIL] Submit',
        url: 'https://example.com',
      };

      const regions: SensitiveRegion[] = [
        {
          id: 'r-1',
          boundingBox: { x: 10, y: 10, width: 100, height: 30 },
          sources: ['ocr'],
          type: 'EMAIL',
          confidence: 0.90,
          redacted: true,
        },
      ];

      const result = evaluatePrivacyPolicy(payload, regions);
      expect(result.safe).toBe(true);
    });

    it('policy blocks when raw PII leaks in OCR text', () => {
      const payload: AnalyzeRequest = {
        screenshot: 'data:image/png;base64,safeData',
        accessibilityTree: [],
        domStructure: '<form />',
        ocrText: 'Email: user@example.com',
        url: 'https://example.com',
      };

      const result = evaluatePrivacyPolicy(payload, []);
      expect(result.safe).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  // ─── Overlapping OCR + DOM detections merge in fusion ──────────────────────

  describe('OCR + DOM Fusion Overlap', () => {
    it('overlapping OCR and DOM email detections merge into a single region', () => {
      const domItems: DetectedItem[] = [
        {
          id: 'dom-email-overlap',
          type: 'EMAIL',
          value: 'test@example.com',
          placeholder: '[EMAIL]',
          confidence: 0.95,
          method: 'dom',
          status: 'detected',
          location: {
            boundingBox: { x: 100, y: 100, width: 200, height: 40 },
          },
          timestamp: Date.now(),
        },
      ];

      const ocrResults: OcrResult[] = [
        {
          text: 'test@example.com',
          confidence: 0.90,
          boundingBox: { x: 105, y: 102, width: 190, height: 35 },
        },
      ];

      const fused = fuseDetections(domItems, ocrResults, []);

      // Should merge into ONE region (IoU > 0.4 or containment)
      expect(fused).toHaveLength(1);
      expect(fused[0].type).toBe('EMAIL');
      expect(fused[0].sources).toContain('dom');
      expect(fused[0].sources).toContain('ocr');
    });
  });
});
