/**
 * semanticPlaceholder.test.ts
 *
 * Test suite for Context-Aware Semantic Placeholder Redaction.
 *
 * Validates:
 * 1. Semantic placeholder generation for common environment variables and secrets.
 * 2. Preservation of surrounding context and variable names.
 * 3. Fallback to YOUR_JWT_TOKEN for generic JWTs with no variable context.
 * 4. Preservation of non-sensitive structural URLs (e.g. NEXT_PUBLIC_API_URL).
 * 5. Input form field semantic identity preservation (EMAIL=YOUR_EMAIL, PASSWORD=YOUR_PASSWORD).
 * 6. Multi-modal sanitization across DOM skeleton, A11y tree, OCR text, and screenshot canvas.
 * 7. Verification that original raw secrets are absent from all outputs.
 */

import {
  getSemanticPlaceholder,
  formatPlaceholderFromVariableName,
  extractVariableNameFromContext,
  sanitizeContextString,
  formatFormFieldPlaceholder,
} from '../sanitization/semanticPlaceholder';
import {
  sanitizeText,
  sanitizeRawText,
  buildSanitizedPayload,
  validatePayloadIsSafe,
} from '../sanitization/sanitizer';
import { buildDomSkeleton } from '../overlays/domSkeleton';
import { buildA11yTree } from '../overlays/accessibilityTree';
import { sanitizeOcrText, sanitizeOcrResults } from '../ocr/ocrEngine';
import { redactScreenshotCanvas } from '../privacy/screenshotRedactor';
import { evaluatePrivacyPolicy } from '../privacy/policyEngine';
import { DetectedItem, SensitiveRegion, AnalyzeRequest } from '../core/types';
import { resolveActionValue } from '../actions/actionExecutor';

describe('Semantic Placeholder Generator', () => {
  describe('Variable Name Extraction & Placeholder Formatting', () => {
    test('extracts variable name from assignment context', () => {
      expect(
        extractVariableNameFromContext(
          'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyB31234567890abcdef',
          'AIzaSyB31234567890abcdef'
        )
      ).toBe('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');

      expect(
        extractVariableNameFromContext(
          'const NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co"',
          'https://project.supabase.co'
        )
      ).toBe('NEXT_PUBLIC_SUPABASE_URL');

      expect(
        extractVariableNameFromContext(
          'export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        )
      ).toBe('SUPABASE_SERVICE_ROLE_KEY');

      expect(
        extractVariableNameFromContext('MY_API_KEY = "abc123456789"', 'abc123456789')
      ).toBe('MY_API_KEY');
    });

    test('formats standardized placeholders from variable names', () => {
      expect(formatPlaceholderFromVariableName('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')).toBe(
        'YOUR_GOOGLE_MAPS_API_KEY'
      );
      expect(formatPlaceholderFromVariableName('NEXT_PUBLIC_SUPABASE_URL')).toBe(
        'YOUR_SUPABASE_PROJECT_URL'
      );
      expect(formatPlaceholderFromVariableName('NEXT_PUBLIC_SUPABASE_ANON_KEY')).toBe(
        'YOUR_SUPABASE_ANON_KEY'
      );
      expect(formatPlaceholderFromVariableName('SUPABASE_SERVICE_ROLE_KEY')).toBe(
        'YOUR_SUPABASE_SERVICE_ROLE_KEY'
      );
      expect(formatPlaceholderFromVariableName('MY_API_KEY')).toBe('YOUR_MY_API_KEY');
      expect(formatPlaceholderFromVariableName('STRIPE_SECRET_KEY')).toBe('YOUR_STRIPE_SECRET_KEY');
      expect(formatPlaceholderFromVariableName('DATABASE_URL')).toBe('YOUR_DATABASE_URL');
      expect(formatPlaceholderFromVariableName('RAZORPAY_KEY')).toBe('YOUR_RAZORPAY_KEY');
      expect(formatPlaceholderFromVariableName('AWS_ACCESS_KEY')).toBe('YOUR_AWS_ACCESS_KEY');
      expect(formatPlaceholderFromVariableName('AWS_SECRET_KEY')).toBe('YOUR_AWS_SECRET_KEY');
    });
  });

  describe('Core Specification Scenarios', () => {
    test('Scenario 1: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=REAL_KEY', () => {
      const line = 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyB31234567890abcdefghijklmnopqr';
      const secret = 'AIzaSyB31234567890abcdefghijklmnopqr';
      const sanitized = sanitizeContextString(line, secret, 'GOOGLE_KEY');

      expect(sanitized).toBe('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY');
      expect(sanitized).not.toContain(secret);
    });

    test('Scenario 2: NEXT_PUBLIC_SUPABASE_URL=REAL_URL', () => {
      const line = 'NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh123456.supabase.co';
      const secret = 'https://abcdefgh123456.supabase.co';
      const sanitized = sanitizeContextString(line, secret, 'SUPABASE_KEY');

      expect(sanitized).toBe('NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL');
      expect(sanitized).not.toContain(secret);
    });

    test('Scenario 3: NEXT_PUBLIC_SUPABASE_ANON_KEY=REAL_KEY', () => {
      const line = 'NEXT_PUBLIC_SUPABASE_ANON_KEY=sbp_9876543210abcdef1234567890';
      const secret = 'sbp_9876543210abcdef1234567890';
      const sanitized = sanitizeContextString(line, secret, 'SUPABASE_KEY');

      expect(sanitized).toBe('NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY');
      expect(sanitized).not.toContain(secret);
    });

    test('Scenario 4: SUPABASE_SERVICE_ROLE_KEY=REAL_JWT', () => {
      const line = 'SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.xyzSecretSignature12345';
      const secret = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.xyzSecretSignature12345';
      const sanitized = sanitizeContextString(line, secret, 'JWT_SECRET');

      expect(sanitized).toBe('SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY');
      expect(sanitized).not.toContain(secret);
    });

    test('Scenario 5: Generic JWT with NO surrounding context', () => {
      const standaloneJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature1234567890';
      const placeholder = getSemanticPlaceholder('JWT_SECRET', standaloneJwt);

      expect(placeholder).toBe('YOUR_JWT_TOKEN');
    });

    test('Scenario 6: STRIPE_SECRET_KEY=sk_test_xxxxx', () => {
      const line = 'STRIPE_SECRET_KEY=sk_test_51Abcdefghijklmnopqrstuvwxyz12345';
      const secret = 'sk_test_51Abcdefghijklmnopqrstuvwxyz12345';
      const sanitized = sanitizeContextString(line, secret, 'STRIPE_KEY');

      expect(sanitized).toBe('STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY');
      expect(sanitized).not.toContain(secret);
    });

    test('Scenario 7: DATABASE_URL=postgresql://user:password@host/db', () => {
      const line = 'DATABASE_URL=postgresql://postgres:topSecret123@db.supabase.co:5432/postgres';
      const secret = 'postgresql://postgres:topSecret123@db.supabase.co:5432/postgres';
      const sanitized = sanitizeContextString(line, secret, 'POSTGRES_URL');

      expect(sanitized).toBe('DATABASE_URL=YOUR_DATABASE_URL');
      expect(sanitized).not.toContain(secret);
    });

    test('Scenario 8: DO NOT over-redact non-sensitive structural URLs', () => {
      const safeConfig = 'NEXT_PUBLIC_API_URL=http://localhost:5000';
      const sanitized = sanitizeRawText(safeConfig);

      // Must remain identical because localhost:5000 is not sensitive
      expect(sanitized).toBe('NEXT_PUBLIC_API_URL=http://localhost:5000');
    });

    test('Scenario 9: Form fields preserve semantic identity', () => {
      expect(formatFormFieldPlaceholder('EMAIL', 'john@example.com')).toBe('EMAIL=YOUR_EMAIL');
      expect(formatFormFieldPlaceholder('PASSWORD', 'actualPassword123')).toBe('PASSWORD=YOUR_PASSWORD');
      expect(formatFormFieldPlaceholder('PASSWORD', 'secret', 'userPassword')).toBe('PASSWORD=YOUR_PASSWORD');
    });
  });

  describe('Multi-Modal Sanitization Invariants', () => {
    const realSecret = 'AIzaSyB31234567890abcdefghijklmnopqrst1';

    test('DOM Skeleton preserves structure while applying semantic placeholder', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <form id="auth-form">
          <input type="password" id="pass" name="password" value="actualSecretPw" />
          <input type="email" id="user-email" name="email" value="alice@example.com" />
          <div id="env-box">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${realSecret}</div>
        </form>
      `;

      const skeleton = buildDomSkeleton(container);

      // Structure preserved
      expect(skeleton).toContain('<input id="pass" type="password" name="password"');
      expect(skeleton).toContain('data-placeholder="PASSWORD=YOUR_PASSWORD"');
      expect(skeleton).toContain('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY');

      // Zero raw secrets
      expect(skeleton).not.toContain(realSecret);
      expect(skeleton).not.toContain('actualSecretPw');
      expect(skeleton).not.toContain('alice@example.com');
    });

    test('Accessibility Tree sanitizes labels with semantic placeholders', () => {
      const btn = document.createElement('button');
      btn.id = 'map-btn';
      btn.setAttribute('aria-label', `Config: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${realSecret}`);
      document.body.appendChild(btn);

      const tree = buildA11yTree(btn);
      expect(tree.length).toBe(1);
      expect(tree[0].label).toContain('YOUR_GOOGLE_MAPS_API_KEY');
      expect(tree[0].label).not.toContain(realSecret);

      document.body.removeChild(btn);
    });

    test('OCR Sanitization replaces secrets in text with semantic placeholders', () => {
      const rawOcr = `
        Environment Setup:
        NEXT_PUBLIC_SUPABASE_ANON_KEY=sbp_1234567890abcdef1234567890
        DATABASE_URL=postgresql://admin:password@localhost:5432/mydb
      `;

      const sanitizedOcr = sanitizeOcrText(rawOcr);

      expect(sanitizedOcr).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY');
      expect(sanitizedOcr).toContain('DATABASE_URL=YOUR_DATABASE_URL');
      expect(sanitizedOcr).not.toContain('sbp_1234567890abcdef1234567890');
      expect(sanitizedOcr).not.toContain('postgresql://admin:password@localhost:5432/mydb');

      const ocrResults = sanitizeOcrResults([
        {
          text: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${realSecret}`,
          boundingBox: { x: 10, y: 10, width: 200, height: 30 },
          confidence: 0.95,
        },
      ]);

      expect(ocrResults[0].text).toBe('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY');
      expect(ocrResults[0].text).not.toContain(realSecret);
    });

    test('Canvas Screenshot Redaction renders semantic placeholder', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;

      const mockCtx = {
        save: jest.fn(),
        restore: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        fillText: jest.fn(),
        drawImage: jest.fn(),
      };
      canvas.getContext = jest.fn().mockReturnValue(mockCtx as any);

      const regions: SensitiveRegion[] = [
        {
          id: 'reg-1',
          boundingBox: { x: 20, y: 20, width: 250, height: 40 },
          sources: ['regex'],
          type: 'GOOGLE_KEY',
          confidence: 0.99,
          semanticPlaceholder: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY',
        },
      ];

      redactScreenshotCanvas(canvas, regions, 'blackout');

      expect(regions[0].redacted).toBe(true);
      expect(regions[0].semanticPlaceholder).toBe(
        'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY'
      );
      expect(mockCtx.fillText).toHaveBeenCalledWith(
        'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY',
        20,
        30
      );
    });

    test('Fail-Closed Policy Engine accepts valid semantic placeholders', () => {
      const sanitizedRequest: AnalyzeRequest = {
        domStructure: '<input type="password" name="password" data-placeholder="PASSWORD=YOUR_PASSWORD" />\n<div>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY</div>',
        ocrText: 'NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY',
        url: 'https://example.com/app',
        taskDescription: 'Inspect database configuration',
      };

      const evalResult = evaluatePrivacyPolicy(sanitizedRequest, []);
      expect(evalResult.safe).toBe(true);
      expect(evalResult.violations).toHaveLength(0);
      expect(evalResult.auditMetrics.rawPiiTransmitted).toBe(0);
    });

    test('Local Agent Action resolves symbolic references client-side only', () => {
      // Local secrets store (never sent to server)
      const localStore: Record<string, string> = {
        LOCAL_EMAIL: 'user@private-domain.gov',
        LOCAL_PASSWORD: 'superSecretPassword!2026',
      };

      // Server returns only symbolic reference
      const serverAction = {
        action: 'type' as const,
        selector: '#email-input',
        valueRef: 'LOCAL_EMAIL',
      };

      // Resolved in browser
      const resolved = resolveActionValue(serverAction, localStore);
      expect(resolved).toBe('user@private-domain.gov');

      // Verify the server action object itself never contained raw value
      expect(JSON.stringify(serverAction)).not.toContain('user@private-domain.gov');
    });
  });
});
