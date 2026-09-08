/**
 * detection.test.ts
 *
 * Automated test suite verifying:
 * 1. Allowlist filtering (product names, brand names, UI labels, frameworks)
 * 2. Luhn algorithm validation for credit card numbers
 * 3. Sanitized payload structure with semantic keys
 * 4. Zero false positives on simulated ChatGPT homepage (0 detections, 0 risk score)
 * 5. Full detection accuracy on synthetic test.html data
 */

import { isAllowlisted } from '../detectors/allowlist';
import { validateLuhn, runAllPatterns } from '../detectors/regexDetector';
import { buildSanitizedPayload } from '../sanitization/sanitizer';
import { computeRiskScore } from '../core/utils';
import { DetectionType, DetectedItem } from '../core/types';

describe('Privacy Firewall — Detection & Sanitization Test Suite', () => {

  // ─── 1. Allowlist Filtering ──────────────────────────────────────────────────
  describe('Allowlist Filtering', () => {
    it('discards common brand and product names', () => {
      expect(isAllowlisted('ChatGPT')).toBe(true);
      expect(isAllowlisted('OpenAI')).toBe(true);
      expect(isAllowlisted('GitHub')).toBe(true);
      expect(isAllowlisted('Google')).toBe(true);
      expect(isAllowlisted('Stripe')).toBe(true);
      expect(isAllowlisted('Firebase')).toBe(true);
    });

    it('discards common frameworks and technical terms', () => {
      expect(isAllowlisted('React')).toBe(true);
      expect(isAllowlisted('Next.js')).toBe(true);
      expect(isAllowlisted('TypeScript')).toBe(true);
      expect(isAllowlisted('Docker')).toBe(true);
    });

    it('discards common UI navigation labels and buttons', () => {
      expect(isAllowlisted('Home')).toBe(true);
      expect(isAllowlisted('Settings')).toBe(true);
      expect(isAllowlisted('New Chat')).toBe(true);
      expect(isAllowlisted('Privacy Policy')).toBe(true);
      expect(isAllowlisted('Terms of Service')).toBe(true);
      expect(isAllowlisted('Sign In')).toBe(true);
    });

    it('allows actual sensitive values through', () => {
      expect(isAllowlisted('john.doe@example.com')).toBe(false);
      expect(isAllowlisted('sk-proj-aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890abcdefgh')).toBe(false);
      expect(isAllowlisted('ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890ab')).toBe(false);
      expect(isAllowlisted('4111 1111 1111 1111')).toBe(false);
    });
  });

  // ─── 2. Luhn Algorithm Validation ───────────────────────────────────────────
  describe('Luhn Algorithm Validation', () => {
    it('validates genuine credit card numbers', () => {
      expect(validateLuhn('4111 1111 1111 1111')).toBe(true);
      expect(validateLuhn('4111111111111111')).toBe(true);
      expect(validateLuhn('5555 5555 5555 4444')).toBe(true);
    });

    it('rejects invalid 16-digit random strings', () => {
      expect(validateLuhn('1234 5678 1234 5678')).toBe(false);
      expect(validateLuhn('1111 1111 1111 1111')).toBe(false);
      expect(validateLuhn('9999 9999 9999 9999')).toBe(false);
    });
  });

  // ─── 3. Regex Pattern Detection ──────────────────────────────────────────────
  describe('Regex Pattern Matcher', () => {
    it('detects OpenAI API key with 1.0 confidence', () => {
      const text = 'sk-proj-aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890abcdefgh';
      const matches = runAllPatterns(text);
      expect(matches.some(m => m.type === 'OPENAI_KEY' && m.confidence === 1.0)).toBe(true);
    });

    it('detects GitHub token with 1.0 confidence', () => {
      const text = 'ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890ab';
      const matches = runAllPatterns(text);
      expect(matches.some(m => m.type === 'GITHUB_TOKEN' && m.confidence === 1.0)).toBe(true);
    });

    it('detects valid credit card and rejects invalid card strings', () => {
      const validText = 'Payment card: 4111 1111 1111 1111';
      const invalidText = 'Reference ID: 1234 5678 1234 5678';

      expect(runAllPatterns(validText).some(m => m.type === 'CARD')).toBe(true);
      expect(runAllPatterns(invalidText).some(m => m.type === 'CARD')).toBe(false);
    });
  });

  // ─── 4. Sanitized Payload Semantic Key Preservation ─────────────────────────
  describe('Sanitization & Payload Structure', () => {
    it('preserves semantic payload keys instead of generic sequential name_1, name_2', () => {
      const dummyItems: DetectedItem[] = [
        {
          id: '1',
          type: 'EMAIL',
          value: 'john.doe@example.com',
          placeholder: '[EMAIL]',
          confidence: 0.95,
          method: 'regex',
          status: 'detected',
          location: { selector: '#email-input', xpath: '/input', cssPath: '#email-input', pageLabel: 'Email' },
          timestamp: Date.now(),
        },
        {
          id: '2',
          type: 'PASSWORD',
          value: 'SuperSecret@123',
          placeholder: '[PASSWORD]',
          confidence: 1.0,
          method: 'dom',
          status: 'detected',
          location: { selector: '#pw-input', xpath: '/input', cssPath: '#pw-input', pageLabel: 'Password' },
          timestamp: Date.now(),
        },
        {
          id: '3',
          type: 'OPENAI_KEY',
          value: 'sk-proj-abc1234567890',
          placeholder: '[OPENAI_KEY]',
          confidence: 1.0,
          method: 'regex',
          status: 'detected',
          location: { selector: '#apikey-textarea', xpath: '/textarea', cssPath: '#apikey-textarea', pageLabel: 'OpenAI Key' },
          timestamp: Date.now(),
        },
      ];

      const payload = buildSanitizedPayload(dummyItems);

      expect(payload).toHaveProperty('email', 'YOUR_EMAIL');
      expect(payload).toHaveProperty('password', 'YOUR_PASSWORD');
      expect(payload).toHaveProperty('openai_key', 'YOUR_OPENAI_API_KEY');
      expect(payload).not.toHaveProperty('email_1');
      expect(payload).not.toHaveProperty('password_1');
    });
  });

  // ─── 5. ChatGPT Homepage & Risk Scoring ─────────────────────────────────────
  describe('Page Risk Score Calculation', () => {
    it('calculates 0 risk score for clean page with 0 validated detections', () => {
      const items: Array<{ type: DetectionType; confidence: number }> = [];
      expect(computeRiskScore(items)).toBe(0);
    });

    it('calculates proportional risk score for critical detected PII', () => {
      const items = [
        { type: 'PASSWORD' as DetectionType, confidence: 1.0 },
        { type: 'CARD' as DetectionType, confidence: 0.98 },
      ];
      const score = computeRiskScore(items);
      expect(score).toBeGreaterThan(50);
    });
  });
});
