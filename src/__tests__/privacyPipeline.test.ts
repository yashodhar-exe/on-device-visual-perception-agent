/**
 * privacyPipeline.test.ts
 *
 * Comprehensive tests for the multi-layer Privacy Pipeline:
 *  - Hybrid Detection Fusion (IoU overlap clustering)
 *  - Sanitized Accessibility Tree Builder
 *  - Sanitized DOM Skeleton Builder
 *  - Fail-Closed Privacy Policy Engine
 */

import { fuseDetections, computeEnclosingBox } from '../privacy/hybridFusion';
import { evaluatePrivacyPolicy, validatePayloadBeforeTransmission } from '../privacy/policyEngine';
import { buildDomSkeleton } from '../overlays/domSkeleton';
import { DetectedItem, OcrResult, SensitiveRegion, AnalyzeRequest } from '../core/types';

describe('Privacy Pipeline Subsystems', () => {
  describe('Hybrid Detection Fusion', () => {
    it('fuses overlapping detections from DOM and OCR into one sensitive region', () => {
      const mockDomItems: DetectedItem[] = [
        {
          id: 'item-1',
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

      const mockOcrResults: OcrResult[] = [
        {
          text: 'test@example.com',
          confidence: 0.90,
          boundingBox: { x: 105, y: 102, width: 190, height: 35 },
        },
      ];

      const fused = fuseDetections(mockDomItems, mockOcrResults);

      // Should merge into ONE sensitive region
      expect(fused).toHaveLength(1);
      expect(fused[0].type).toBe('EMAIL');
      expect(fused[0].sources).toContain('dom');
      expect(fused[0].sources).toContain('ocr');
      expect(fused[0].boundingBox.x).toBeLessThanOrEqual(100);
      expect(fused[0].boundingBox.width).toBeGreaterThanOrEqual(195);
    });

    it('retains disjoint detections as distinct regions', () => {
      const mockDomItems: DetectedItem[] = [
        {
          id: 'item-1',
          type: 'EMAIL',
          value: 'user@domain.com',
          placeholder: '[EMAIL]',
          confidence: 0.95,
          method: 'dom',
          status: 'detected',
          location: {
            boundingBox: { x: 50, y: 50, width: 150, height: 30 },
          },
          timestamp: Date.now(),
        },
        {
          id: 'item-2',
          type: 'PASSWORD',
          value: 'secret123',
          placeholder: '[PASSWORD]',
          confidence: 1.0,
          method: 'dom',
          status: 'detected',
          location: {
            boundingBox: { x: 50, y: 120, width: 150, height: 30 },
          },
          timestamp: Date.now(),
        },
      ];

      const fused = fuseDetections(mockDomItems, []);
      expect(fused).toHaveLength(2);
    });

    it('computes correct enclosing bounding box', () => {
      const boxA = { x: 10, y: 20, width: 50, height: 40 };
      const boxB = { x: 30, y: 15, width: 60, height: 55 };

      const enclosing = computeEnclosingBox(boxA, boxB);
      expect(enclosing.x).toBe(10);
      expect(enclosing.y).toBe(15);
      expect(enclosing.width).toBe(80); // (30+60) - 10 = 80
      expect(enclosing.height).toBe(55); // (15+55) - 15 = 55
    });
  });

  describe('Sanitized DOM Skeleton', () => {
    it('strips sensitive values while preserving form structure', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <form id="login-form">
          <input id="email-field" type="email" value="leaked@example.com" />
          <input id="pass-field" type="password" value="mysecretpassword" />
          <button id="submit-btn">Sign In</button>
        </form>
      `;

      const skeleton = buildDomSkeleton(container);

      // Raw values must NEVER appear in the skeleton
      expect(skeleton).not.toContain('leaked@example.com');
      expect(skeleton).not.toContain('mysecretpassword');
      expect(skeleton).toContain('id="login-form"');
      expect(skeleton).toContain('id="email-field"');
      expect(skeleton).toContain('id="submit-btn"');
    });
  });

  describe('Fail-Closed Policy Engine', () => {
    const validRegions: SensitiveRegion[] = [
      {
        id: 'r-1',
        boundingBox: { x: 10, y: 10, width: 100, height: 30 },
        sources: ['dom'],
        type: 'EMAIL',
        confidence: 0.95,
        redacted: true, // Marked as redacted
      },
    ];

    it('passes safe payload with sanitized metadata and redacted regions', () => {
      const safePayload: AnalyzeRequest = {
        screenshot: 'data:image/png;base64,safeScreenshotData',
        accessibilityTree: [
          {
            role: 'textbox',
            label: '[EMAIL]',
            selector: '#email',
            tagName: 'INPUT',
            boundingBox: { x: 10, y: 10, width: 100, height: 30 },
          },
        ],
        domStructure: '<form id="login"><input id="email" /> [PROTECTED] </form>',
        ocrText: 'Login [EMAIL] Submit',
        url: 'https://example.com/login',
      };

      const result = evaluatePrivacyPolicy(safePayload, validRegions);
      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.auditMetrics.rawPiiTransmitted).toBe(0);
    });

    it('blocks payload when an unredacted sensitive region exists', () => {
      const unredactedRegions: SensitiveRegion[] = [
        {
          id: 'r-1',
          boundingBox: { x: 10, y: 10, width: 100, height: 30 },
          sources: ['dom'],
          type: 'PASSWORD',
          confidence: 1.0,
          redacted: false, // NOT REDACTED!
        },
      ];

      const payload: AnalyzeRequest = {
        screenshot: 'data:image/png;base64,unredacted',
        accessibilityTree: [],
        domStructure: '<form />',
        ocrText: '',
        url: 'https://example.com',
      };

      const result = evaluatePrivacyPolicy(payload, unredactedRegions);
      expect(result.safe).toBe(false);
      expect(result.blockedReason).toBe('POLICY_VIOLATION');
      expect(result.violations[0]).toContain('Unredacted sensitive regions');
    });

    it('blocks payload and throws on validatePayloadBeforeTransmission when raw email leaks into DOM', () => {
      const leakedPayload: AnalyzeRequest = {
        screenshot: 'data:image/png;base64,data',
        accessibilityTree: [],
        domStructure: '<form><input value="leaked.user@gmail.com" /></form>',
        ocrText: '',
        url: 'https://example.com',
      };

      expect(() =>
        validatePayloadBeforeTransmission(leakedPayload, validRegions)
      ).toThrow('POLICY_VIOLATION');
    });
  });
});
