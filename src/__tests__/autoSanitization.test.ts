/**
 * autoSanitization.test.ts
 *
 * Comprehensive Regression Test Suite for:
 * DETECTION MUST LEAD TO AUTOMATIC SANITIZATION — NOT JUST BLOCKING
 *
 * Invariants:
 * 1. User enters 9954634442 -> automatically replaced with [PHONE_NUMBER]
 * 2. Rest of user text remains exactly intact (minimal, targeted span replacement)
 * 3. Multiple secrets in single input are all sanitized from RIGHT to LEFT
 * 4. Normal numbers ("DAA has 10 modules", "Order 12345") are NEVER sanitized
 * 5. State transitions: SAFE -> SENSITIVE_DETECTED -> SANITIZING -> SANITIZED -> VERIFIED -> SEND ENABLED
 * 6. Webpage output / AI responses are strictly preserved
 * 7. Composer remains typable, focus and selection maintained
 * 8. Final outgoing payload validation passes before transmission
 */

import {
  AiSendGate,
  replaceWithAiSemanticPlaceholders,
  findPromptSensitiveMatches,
  getDetectionSpans,
} from '../privacy/aiSendGate';
import { validatePayloadBeforeTransmission } from '../privacy/policyEngine';

describe('Automatic Input Sanitization & Send Gate Enablement', () => {
  let sendGate: AiSendGate;
  let composer: HTMLTextAreaElement;
  let sendBtn: HTMLButtonElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="composer-container">
        <textarea id="prompt-textarea"></textarea>
        <button data-testid="send-button">Send</button>
      </div>
    `;

    sendGate = new AiSendGate();
    sendGate.init('https://chatgpt.com');
    composer = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
    sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
  });

  afterEach(() => {
    sendGate.destroy();
    document.body.innerHTML = '';
  });

  // ─── 1. Exact Regression Test Cases ─────────────────────────────────────────

  describe('1. Exact Phone Number & Credential Test Cases', () => {
    it('Exact test input "9954634442" -> replaces with "[PHONE_NUMBER]"', () => {
      const input = '9954634442';
      const matches = findPromptSensitiveMatches(input);
      expect(matches.length).toBeGreaterThan(0);

      const spans = getDetectionSpans(input, matches);
      expect(spans.length).toBe(1);
      expect(spans[0].placeholder).toBe('[PHONE_NUMBER]');
      expect(spans[0].start).toBe(0);
      expect(spans[0].end).toBe(10);

      const { sanitizedText } = replaceWithAiSemanticPlaceholders(input, matches);
      expect(sanitizedText).toBe('[PHONE_NUMBER]');
    });

    it('Exact test input "+91 9954634442" -> replaces with "[PHONE_NUMBER]"', () => {
      const input = '+91 9954634442';
      const matches = findPromptSensitiveMatches(input);
      expect(matches.length).toBeGreaterThan(0);

      const { sanitizedText } = replaceWithAiSemanticPlaceholders(input, matches);
      expect(sanitizedText).toBe('[PHONE_NUMBER]');
    });

    it('Exact test input "My phone number is 9954634442" -> replaces with "My phone number is [PHONE_NUMBER]"', () => {
      const input = 'My phone number is 9954634442';
      const matches = findPromptSensitiveMatches(input);
      expect(matches.length).toBeGreaterThan(0);

      const { sanitizedText } = replaceWithAiSemanticPlaceholders(input, matches);
      expect(sanitizedText).toBe('My phone number is [PHONE_NUMBER]');
    });

    it('Email: replaces "vikranth@gmail.com" with "[EMAIL]"', () => {
      const input = 'My email is vikranth@gmail.com';
      const matches = findPromptSensitiveMatches(input);
      expect(matches.length).toBeGreaterThan(0);

      const { sanitizedText } = replaceWithAiSemanticPlaceholders(input, matches);
      expect(sanitizedText).toBe('My email is [EMAIL]');
    });

    it('API Secret: replaces "sk-test-7fK9mQ2xLp4Vn8Rz6Tj3Hs5Wc1Yb0DgA" with "[API_KEY]"', () => {
      const input = 'My key is sk-test-7fK9mQ2xLp4Vn8Rz6Tj3Hs5Wc1Yb0DgA';
      const matches = findPromptSensitiveMatches(input);
      expect(matches.length).toBeGreaterThan(0);

      const { sanitizedText } = replaceWithAiSemanticPlaceholders(input, matches);
      expect(sanitizedText).toBe('My key is [API_KEY]');
    });
  });

  // ─── 2. Multiple Secrets & Preserving User Intent ───────────────────────────

  describe('2. Multiple Secrets & Semantic Intent Preservation', () => {
    it('sanitizes multiple mixed secrets while leaving surrounding text intact', () => {
      const input = 'My phone is 9954634442 and my email is example@gmail.com';
      const matches = findPromptSensitiveMatches(input);
      expect(matches.length).toBe(2);

      const { sanitizedText } = replaceWithAiSemanticPlaceholders(input, matches);
      expect(sanitizedText).toBe('My phone is [PHONE_NUMBER] and my email is [EMAIL]');
      expect(sanitizedText).not.toContain('9954634442');
      expect(sanitizedText).not.toContain('example@gmail.com');
    });

    it('processes multiline input accurately: Phone, Email, API Key', () => {
      const input = `Phone: 9954634442
Email: test@example.com
API Key: sk-test-7fK9mQ2xLp4Vn8Rz6Tj3Hs5Wc1Yb0DgA`;

      const matches = findPromptSensitiveMatches(input);
      expect(matches.length).toBe(3);

      const { sanitizedText } = replaceWithAiSemanticPlaceholders(input, matches);
      expect(sanitizedText).toBe(`Phone: [PHONE_NUMBER]
Email: [EMAIL]
API Key: [API_KEY]`);
    });

    it('input containing multiple API secrets replaces all with semantic placeholders', () => {
      const input = `OpenAI: sk-test-7fK9mQ2xLp4Vn8Rz6Tj3Hs5Wc1Yb0DgA
Anthropic: sk-ant-api03-abcdef1234567890abcdef1234567890
GitHub: ghp_1234567890abcdefghijklmnopqrstuvwxyz`;

      const matches = findPromptSensitiveMatches(input);
      expect(matches.length).toBe(3);

      const { sanitizedText } = replaceWithAiSemanticPlaceholders(input, matches);
      expect(sanitizedText).toBe(`OpenAI: [API_KEY]
Anthropic: [API_KEY]
GitHub: [API_KEY]`);
    });

    it('preserves non-sensitive surrounding context completely', () => {
      const input = 'Here is my phone number +91 9954634442 for testing the application.';
      const matches = findPromptSensitiveMatches(input);
      const { sanitizedText } = replaceWithAiSemanticPlaceholders(input, matches);

      expect(sanitizedText).toBe('Here is my phone number [PHONE_NUMBER] for testing the application.');
    });
  });

  // ─── 3. Negative Tests: Do NOT Sanitize Normal Text/Numbers ───────────────────

  describe('3. Negative Tests: Do NOT Sanitize Normal Numbers Unnecessarily', () => {
    it('"DAA has 10 modules" must remain unchanged', () => {
      const input = 'DAA has 10 modules';
      const matches = findPromptSensitiveMatches(input);
      expect(matches.length).toBe(0);

      const { sanitizedText } = replaceWithAiSemanticPlaceholders(input, matches);
      expect(sanitizedText).toBe('DAA has 10 modules');
    });

    it('"Order 12345" must remain unchanged', () => {
      const input = 'Order 12345';
      const matches = findPromptSensitiveMatches(input);
      expect(matches.length).toBe(0);

      const { sanitizedText } = replaceWithAiSemanticPlaceholders(input, matches);
      expect(sanitizedText).toBe('Order 12345');
    });

    it('Clean text: "Hello, how are you?" produces NO false positive', () => {
      const input = 'Hello, how are you?';
      const matches = findPromptSensitiveMatches(input);
      expect(matches.length).toBe(0);

      const { sanitizedText } = replaceWithAiSemanticPlaceholders(input, matches);
      expect(sanitizedText).toBe('Hello, how are you?');
    });
  });

  // ─── 4. End-to-End State Machine & Live DOM Updates ─────────────────────────

  describe('4. Live Composer Sanitization & Send Gate Enablement', () => {
    it('reproduces 9954634442: updates DOM value to [PHONE_NUMBER], state=VERIFIED, Send=ENABLED', async () => {
      // 1. User inputs 9954634442
      composer.value = '9954634442';
      sendGate.handleContentChange();

      // Initially gated while analyzing
      expect(sendGate.isSubmissionAllowed()).toBe(false);
      expect(sendBtn.disabled).toBe(true);

      // 2. Sanitization pipeline executes
      const success = await sendGate.processAndVerifyContent();
      expect(success).toBe(true);

      // 3. Composer DOM value is actually updated to [PHONE_NUMBER]
      expect(composer.value).toBe('[PHONE_NUMBER]');
      expect(composer.value).not.toContain('9954634442');

      // 4. State transitions to VERIFIED and READY
      expect(sendGate.sendState.status).toBe('VERIFIED');
      expect(sendGate.sendState.verified).toBe(true);
      expect(sendGate.getState()).toBe('READY');

      // 5. Send button is ENABLED
      expect(sendBtn.disabled).toBe(false);
      expect(sendGate.isSubmissionAllowed()).toBe(true);

      // 6. UI badge reflects local protection
      const badge = document.getElementById('__pf_ai_send_gate_badge__');
      expect(badge?.textContent).toBe('🔒 Sensitive information protected locally');
    });

    it('handles Spacebar token completion immediately: 9954634442 + SPACE -> [PHONE_NUMBER] ', async () => {
      composer.value = '9954634442 ';

      // Simulate Spacebar keydown event
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      composer.dispatchEvent(spaceEvent);
      expect(spaceEvent.defaultPrevented).toBe(false);

      // Spacebar immediately triggers content change
      sendGate.handleContentChange(true);
      expect(composer.value).toBe('[PHONE_NUMBER] ');
      expect(sendGate.sendState.status).toBe('VERIFIED');
      expect(sendBtn.disabled).toBe(false);
    });

    it('handles Paste behavior automatically: pastes text with secrets and sanitizes immediately', async () => {
      composer.value = 'My phone is 9954634442 and my email is test@example.com';
      sendGate.handleContentChange(true);

      expect(composer.value).toBe('My phone is [PHONE_NUMBER] and my email is [EMAIL]');
      expect(sendGate.sendState.status).toBe('VERIFIED');
      expect(sendBtn.disabled).toBe(false);
    });

    it('handles editing and modifying text after sanitization', async () => {
      // 1. Initial input sanitized
      composer.value = 'My phone number is 9954634442';
      sendGate.handleContentChange(true);

      expect(composer.value).toBe('My phone number is [PHONE_NUMBER]');
      expect(sendGate.isSubmissionAllowed()).toBe(true);
      expect(sendBtn.disabled).toBe(false);

      // 2. User types a new secret into the composer
      composer.value = 'My phone number is [PHONE_NUMBER] and key is sk-test-7fK9mQ2xLp4Vn8Rz6Tj3Hs5Wc1Yb0DgA';
      sendGate.handleContentChange();

      // Immediately invalidated
      expect(sendGate.isSubmissionAllowed()).toBe(false);
      expect(sendBtn.disabled).toBe(true);

      // 3. New content sanitized and verified
      await sendGate.processAndVerifyContent();
      expect(composer.value).toBe('My phone number is [PHONE_NUMBER] and key is [API_KEY]');
      expect(sendGate.isSubmissionAllowed()).toBe(true);
      expect(sendBtn.disabled).toBe(false);
    });
  });

  // ─── 5. Final Outgoing Validation Security Boundary ─────────────────────────

  describe('5. Final Outgoing Validation', () => {
    it('passes transmission policy validation for sanitized output "My phone is [PHONE_NUMBER]"', () => {
      const sanitizedPrompt = 'My phone is [PHONE_NUMBER]';

      expect(() => {
        validatePayloadBeforeTransmission({
          taskDescription: sanitizedPrompt,
          domStructure: '<div></div>',
          accessibilityTree: [],
          url: 'https://chatgpt.com',
        });
      }).not.toThrow();
    });

    it('blocks transmission if original phone number 9954634442 is still present', () => {
      const rawPrompt = 'My phone is 9954634442';

      expect(() => {
        validatePayloadBeforeTransmission({
          taskDescription: rawPrompt,
          domStructure: '<div></div>',
          accessibilityTree: [],
          url: 'https://chatgpt.com',
        });
      }).toThrow(/Raw PHONE/);
    });
  });
});
