/**
 * aiSendGate.test.ts
 *
 * Comprehensive test suite for the AI Website Send-Button Privacy Gate.
 *
 * Verifies:
 * 1. AI website detection & configurable signatures
 * 2. 8-state machine transitions and button disabled states
 * 3. Semantic placeholder replacement (API keys, email, password, tokens)
 * 4. Critical outgoing payload verification
 * 5. Content hash tracking & race condition invalidation
 * 6. Submission interception (Click, Enter key, Cmd+Enter, Form submit)
 * 7. Non-interference with normal websites (Google, GitHub, StackOverflow)
 * 8. Context precedence (Auth > Messaging > AI Assistant > Normal)
 * 9. Fail-closed error handling
 */

import {
  AiSendGate,
  computeContentHash,
  replaceWithAiSemanticPlaceholders,
  findPromptSensitiveMatches,
} from '../privacy/aiSendGate';
import { ContextDetector, KNOWN_AI_SITES } from '../privacy/contextDetector';
import { ContextPolicyEngine } from '../privacy/contextPolicyEngine';
import { runAllPatterns } from '../detectors/regexDetector';

describe('AI Website Send-Button Privacy Gate', () => {
  let detector: ContextDetector;
  let policyEngine: ContextPolicyEngine;
  let sendGate: AiSendGate;

  beforeEach(() => {
    document.body.innerHTML = '';
    detector = new ContextDetector();
    policyEngine = new ContextPolicyEngine(detector);
    sendGate = new AiSendGate();
  });

  afterEach(() => {
    sendGate.destroy();
    document.body.innerHTML = '';
  });

  // ─── 1. AI Website Detection & Signatures ─────────────────────────────────

  describe('1. AI Website Detection & Signatures', () => {
    it('detects ChatGPT domains', () => {
      const res1 = detector.detectContext('https://chatgpt.com');
      expect(res1.context).toBe('AI_ASSISTANT');
      expect(res1.matchedApp).toBe('ChatGPT');

      const res2 = detector.detectContext('https://chat.openai.com/c/123');
      expect(res2.context).toBe('AI_ASSISTANT');
    });

    it('detects Claude, Gemini, Copilot, and Perplexity', () => {
      expect(detector.detectContext('https://claude.ai/chat').context).toBe('AI_ASSISTANT');
      expect(detector.detectContext('https://gemini.google.com/app').context).toBe('AI_ASSISTANT');
      expect(detector.detectContext('https://copilot.microsoft.com').context).toBe('AI_ASSISTANT');
      expect(detector.detectContext('https://perplexity.ai/search').context).toBe('AI_ASSISTANT');
    });

    it('supports registering new AI website signatures dynamically', () => {
      detector.registerAiSite({
        name: 'Mistral Chat',
        domains: ['chat.mistral.ai'],
        context: 'AI_ASSISTANT',
      });

      const res = detector.detectContext('https://chat.mistral.ai');
      expect(res.context).toBe('AI_ASSISTANT');
      expect(res.matchedApp).toBe('Mistral Chat');
    });

    it('does NOT classify normal websites as AI websites', () => {
      expect(detector.detectContext('https://www.google.com/search?q=ai').context).toBe('NORMAL');
      expect(detector.detectContext('https://github.com/openai/gpt-3').context).toBe('NORMAL');
      expect(detector.detectContext('https://stackoverflow.com/questions/123').context).toBe('NORMAL');
      expect(detector.detectContext('https://en.wikipedia.org/wiki/Artificial_intelligence').context).toBe('NORMAL');
    });
  });

  // ─── 2. Context Policy Precedence ──────────────────────────────────────────

  describe('2. Context Policy Precedence', () => {
    it('enforces AUTHENTICATION > AI_ASSISTANT (e.g. login page on ChatGPT)', () => {
      const policy = policyEngine.evaluateContext('https://chatgpt.com/auth/login');
      expect(policy.context).toBe('AUTHENTICATION');
      expect(policy.policy).toBe('BLOCK_ALL');
      expect(policy.allowAgentActions).toBe(false);
    });

    it('enforces MESSAGING > AI_ASSISTANT precedence', () => {
      const policy = policyEngine.evaluateContext('https://web.whatsapp.com');
      expect(policy.context).toBe('MESSAGING');
      expect(policy.policy).toBe('BLOCK_ALL');
    });

    it('enforces AI_ASSISTANT -> PRIVACY_SEND_GATE policy', () => {
      const policy = policyEngine.evaluateContext('https://chatgpt.com');
      expect(policy.context).toBe('AI_ASSISTANT');
      expect(policy.policy).toBe('PRIVACY_SEND_GATE');
      expect(policy.reason).toBe('AI_ASSISTANT_CONTEXT');
    });

    it('enforces NORMAL -> ALLOW_PRIVACY_PIPELINE', () => {
      const policy = policyEngine.evaluateContext('https://example.com/blog');
      expect(policy.context).toBe('NORMAL');
      expect(policy.policy).toBe('ALLOW_PRIVACY_PIPELINE');
    });
  });

  // ─── 3. Non-Interference with Normal Websites ──────────────────────────────

  describe('3. Non-Interference with Normal Websites', () => {
    it('does not activate send gate on normal web pages', () => {
      document.body.innerHTML = `
        <form id="search-form">
          <input type="text" id="q" value="test query" />
          <button type="submit" id="submit-btn">Search</button>
        </form>
      `;

      const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
      const searchForm = document.getElementById('search-form') as HTMLFormElement;
      searchForm.addEventListener('submit', (e) => e.preventDefault());

      const active = sendGate.init('https://www.google.com');

      expect(active).toBe(false);
      expect(sendGate.getState()).toBe('AI_SITE_DETECTED');
      expect(submitBtn.disabled).toBe(false);

      // Submission is not intercepted
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      submitBtn.dispatchEvent(clickEvent);
      expect(clickEvent.defaultPrevented).toBe(false);
    });
  });

  // ─── 4. State Machine & Button States ──────────────────────────────────────

  describe('4. State Machine & Button States', () => {
    it('disables send button initially upon AI website detection', () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea"></textarea>
        <button data-testid="send-button">Send</button>
      `;

      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
      sendGate.init('https://chatgpt.com');

      expect(sendBtn.disabled).toBe(true);
      expect(sendGate.isSubmissionAllowed()).toBe(false);
    });

    it('enables send button after scan completes when no sensitive data is present', async () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea">Explain how Dijkstra algorithm works</textarea>
        <button data-testid="send-button">Send</button>
      `;

      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
      sendGate.init('https://chatgpt.com');

      const success = await sendGate.processAndVerifyContent();
      expect(success).toBe(true);
      expect(sendGate.getState()).toBe('READY');
      expect(sendBtn.disabled).toBe(false);
      expect(sendGate.isSubmissionAllowed()).toBe(true);
    });

    it('keeps send button disabled while sensitive data is detected until placeholders are applied', async () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea">My email is user.test@example.com and key is sk-proj-1234567890abcdef1234567890abcdef</textarea>
        <button data-testid="send-button">Send</button>
      `;

      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
      sendGate.init('https://chatgpt.com');

      expect(sendGate.getState()).toBe('AI_SITE_DETECTED');
      expect(sendBtn.disabled).toBe(true);
      expect(sendGate.isSubmissionAllowed()).toBe(false);
    });
  });

  // ─── 5. Semantic Placeholder Replacement ───────────────────────────────────

  describe('5. Semantic Placeholder Replacement', () => {
    it('transforms raw assignments into approved semantic placeholders', () => {
      const raw = 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6';
      const matches = findPromptSensitiveMatches(raw);
      expect(matches.length).toBeGreaterThan(0);

      const res = replaceWithAiSemanticPlaceholders(raw, matches);
      expect(res.sanitizedText).toBe(
        'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY'
      );
    });

    it('transforms raw email and password into approved semantic placeholders', () => {
      const rawEmail = 'Contact me at rajesh.kumar@gov.in for questions';
      const emailMatches = findPromptSensitiveMatches(rawEmail);
      const resEmail = replaceWithAiSemanticPlaceholders(rawEmail, emailMatches);
      expect(resEmail.sanitizedText).toContain('[EMAIL]');

      const rawPass = 'The password is My$ecureP@ss2026!';
      const passMatches = findPromptSensitiveMatches(rawPass);
      const resPass = replaceWithAiSemanticPlaceholders(rawPass, passMatches);
      expect(resPass.sanitizedText).toContain('[PASSWORD]');
    });

    it('replaces multiple mixed sensitive tokens in a prompt', () => {
      const rawPrompt = `
        Here is the config:
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6
        rajesh.kumar@gov.in
        My$ecureP@ss2026!
      `;
      const matches = findPromptSensitiveMatches(rawPrompt);
      const res = replaceWithAiSemanticPlaceholders(rawPrompt, matches);

      expect(res.sanitizedText).not.toContain('AIzaSy');
      expect(res.sanitizedText).not.toContain('rajesh.kumar@gov.in');
      expect(res.sanitizedText).not.toContain('My$ecureP@ss2026!');
      expect(res.sanitizedText).toContain('YOUR_GOOGLE_MAPS_API_KEY');
      expect(res.sanitizedText).toContain('[EMAIL]');
      expect(res.sanitizedText).toContain('[PASSWORD]');
    });
  });

  // ─── 6. End-to-End Sanitization & Outgoing Verification ─────────────────────

  describe('6. End-to-End Sanitization & Outgoing Verification', () => {
    it('sanitizes prompt, verifies outgoing payload, and enables send button', async () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea">Connect using rajesh.kumar@gov.in and password My$ecureP@ss2026!</textarea>
        <button data-testid="send-button">Send</button>
      `;

      const textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;

      sendGate.init('https://chatgpt.com');
      expect(sendBtn.disabled).toBe(true);

      const success = await sendGate.processAndVerifyContent();
      expect(success).toBe(true);

      // Value was updated with semantic placeholders
      expect(textarea.value).toContain('[EMAIL]');
      expect(textarea.value).toContain('[PASSWORD]');
      expect(textarea.value).not.toContain('rajesh.kumar@gov.in');
      expect(textarea.value).not.toContain('My$ecureP@ss2026!');

      // Send button is now enabled
      expect(sendGate.getState()).toBe('READY');
      expect(sendBtn.disabled).toBe(false);
      expect(sendGate.isSubmissionAllowed()).toBe(true);
    });

    it('fails closed if outgoing payload contains residual sensitive data', () => {
      const mockRawMatches = [
        {
          type: 'API_KEY' as const,
          value: 'secret_leak_123',
          index: 0,
          confidence: 0.99,
        },
      ];

      // Text that still contains the secret value
      const unredactedText = 'Here is the secret_leak_123 in prompt';
      const isSafe = sendGate.verifyOutgoingPayload(unredactedText, mockRawMatches);
      expect(isSafe).toBe(false);
    });
  });

  // ─── 7. Content Hash & Race Condition Handling ─────────────────────────────

  describe('7. Content Hash & Race Condition Handling', () => {
    it('invalidates verification and disables send button when user edits content', async () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea">Explain how bubblesort works</textarea>
        <button data-testid="send-button">Send</button>
      `;

      const textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;

      sendGate.init('https://chatgpt.com');

      // 1. Initial clean text verified
      await sendGate.processAndVerifyContent();
      expect(sendGate.getState()).toBe('READY');
      expect(sendBtn.disabled).toBe(false);
      expect(sendGate.isSubmissionAllowed()).toBe(true);

      // 2. User modifies prompt with sensitive key
      textarea.value = 'Explain bubblesort, also here is my key: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6';
      sendGate.handleContentChange();

      // Immediately locked down
      expect(sendGate.getVerifiedHash()).toBeNull();
      expect(sendGate.getState()).toBe('ANALYZING');
      expect(sendBtn.disabled).toBe(true);
      expect(sendGate.isSubmissionAllowed()).toBe(false);

      // 3. Sanitization runs for the new content
      await sendGate.processAndVerifyContent();
      expect(textarea.value).toContain('YOUR_GOOGLE_MAPS_API_KEY');
      expect(textarea.value).not.toContain('AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6');
      expect(sendGate.getState()).toBe('READY');
      expect(sendBtn.disabled).toBe(false);
      expect(sendGate.isSubmissionAllowed()).toBe(true);
    });

    it('discards scan if user types during scanning (race condition prevention)', async () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea">Initial query</textarea>
        <button data-testid="send-button">Send</button>
      `;

      const textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
      sendGate.init('https://chatgpt.com');

      // Simulate typing while scan is in-flight: new scanId is triggered
      sendGate.handleContentChange(); // currentScanId becomes 1
      textarea.value = 'Initial query with edits';

      // Stale scanId 999 arrives
      const staleResult = await sendGate.processAndVerifyContent(999);
      expect(staleResult).toBe(false);
      expect(sendGate.isSubmissionAllowed()).toBe(false);
    });

    it('keeps send button disabled when prompt is empty or whitespace only', async () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea">   </textarea>
        <button data-testid="send-button">Send</button>
      `;

      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
      sendGate.init('https://chatgpt.com');

      const verified = await sendGate.processAndVerifyContent();
      expect(verified).toBe(false);
      expect(sendGate.isSubmissionAllowed()).toBe(false);
      expect(sendBtn.disabled).toBe(true);
      expect(sendBtn.style.pointerEvents).not.toBe('none');
    });

    it('synchronously locks send button the moment user types or pastes', async () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea">Clean verified prompt</textarea>
        <button data-testid="send-button">Send</button>
      `;

      const textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
      sendGate.init('https://chatgpt.com');

      await sendGate.processAndVerifyContent();
      expect(sendGate.isSubmissionAllowed()).toBe(true);
      expect(sendBtn.disabled).toBe(false);

      // User types a key
      const keyEvent = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
      textarea.dispatchEvent(keyEvent);

      // Send button must IMMEDIATELY and synchronously be locked
      expect(sendGate.isSubmissionAllowed()).toBe(false);
      expect(sendBtn.disabled).toBe(true);
    });
  });

  // ─── 8. Submission Interception ────────────────────────────────────────────

  describe('8. Submission Interception', () => {
    it('intercepts and blocks click on Send button when not READY', () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea">Sensitive text with secret</textarea>
        <button data-testid="send-button">Send</button>
      `;

      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
      sendGate.init('https://chatgpt.com');

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      sendBtn.dispatchEvent(clickEvent);

      expect(clickEvent.defaultPrevented).toBe(true);
    });

    it('intercepts and blocks Enter key inside composer when not READY', () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea">Unverified prompt</textarea>
        <button data-testid="send-button">Send</button>
      `;

      const textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
      sendGate.init('https://chatgpt.com');

      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });

      textarea.dispatchEvent(enterEvent);
      expect(enterEvent.defaultPrevented).toBe(true);
    });

    it('intercepts and blocks Cmd+Enter / Ctrl+Enter shortcut when not READY', () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea">Unverified prompt</textarea>
        <button data-testid="send-button">Send</button>
      `;

      const textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
      sendGate.init('https://chatgpt.com');

      const cmdEnterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      textarea.dispatchEvent(cmdEnterEvent);
      expect(cmdEnterEvent.defaultPrevented).toBe(true);
    });

    it('intercepts and blocks form submit event when not READY', () => {
      document.body.innerHTML = `
        <form id="ai-form">
          <textarea id="prompt-textarea">Prompt</textarea>
          <button type="submit">Send</button>
        </form>
      `;

      const form = document.getElementById('ai-form') as HTMLFormElement;
      sendGate.init('https://chatgpt.com');

      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
      expect(submitEvent.defaultPrevented).toBe(true);
    });

    it('allows submission once verified and READY', async () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea">Clean safe prompt</textarea>
        <button data-testid="send-button">Send</button>
      `;

      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
      sendGate.init('https://chatgpt.com');

      await sendGate.processAndVerifyContent();
      expect(sendGate.isSubmissionAllowed()).toBe(true);

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      sendBtn.dispatchEvent(clickEvent);

      expect(clickEvent.defaultPrevented).toBe(false);
    });
  });

  // ─── 9. Visual Status Feedback ─────────────────────────────────────────────

  describe('9. Visual Status Feedback', () => {
    it('creates non-sensitive status badge in DOM', () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea">Safe prompt</textarea>
        <button data-testid="send-button">Send</button>
      `;

      sendGate.init('https://chatgpt.com');
      sendGate.handleContentChange();

      const badge = document.getElementById('__pf_ai_send_gate_badge__');
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toContain('Privacy check in progress');
    });

    it('displays verified status without exposing sensitive values', async () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea">My key is AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6</textarea>
        <button data-testid="send-button">Send</button>
      `;

      sendGate.init('https://chatgpt.com');
      await sendGate.processAndVerifyContent();

      const badge = document.getElementById('__pf_ai_send_gate_badge__');
      expect(badge?.textContent).toMatch(/(Privacy verified|Sensitive information protected)/);
      expect(badge?.textContent).not.toContain('AIzaSy');
    });
  });

  // ─── 10. Typable Composer & Send State Machine Regression Suite ─────────────

  describe('10. Typable Composer & Send State Machine Regression Suite', () => {
    let composer: HTMLTextAreaElement;
    let sendBtn: HTMLButtonElement;

    beforeEach(() => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea"></textarea>
        <button data-testid="send-button">Send</button>
      `;
      sendGate.init('https://chatgpt.com');
      composer = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
      sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
    });

    // Test 1: AI page loaded: composer enabled, send disabled
    it('Test 1: AI page loaded - composer is enabled and typable, send is disabled', () => {
      expect(composer.disabled).toBe(false);
      expect(composer.readOnly).toBe(false);
      expect(sendGate.composerEnabled).toBe(true);
      expect(sendBtn.disabled).toBe(true);
      expect(sendGate.sendState.verified).toBe(false);
    });

    // Test 2: User types normal content: composer remains enabled, send initially disabled
    it('Test 2: User types normal content - composer remains enabled, send initially disabled', () => {
      composer.value = 'Explain quantum computing';
      sendGate.handleContentChange();

      expect(composer.disabled).toBe(false);
      expect(composer.readOnly).toBe(false);
      expect(sendGate.composerEnabled).toBe(true);
      expect(sendBtn.disabled).toBe(true);
      expect(sendGate.sendState.verified).toBe(false);
    });

    // Test 3: Safe content successfully verified: composer enabled, send enabled
    it('Test 3: Safe content successfully verified - composer enabled, send enabled', async () => {
      composer.value = 'Explain quantum computing';
      sendGate.handleContentChange();

      const verified = await sendGate.processAndVerifyContent();
      expect(verified).toBe(true);
      expect(composer.disabled).toBe(false);
      expect(composer.readOnly).toBe(false);
      expect(sendBtn.disabled).toBe(false);
      expect(sendGate.sendState.status).toBe('VERIFIED');
      expect(sendGate.sendState.verified).toBe(true);
    });

    // Test 4: Sensitive content detected: composer enabled, send disabled
    it('Test 4: Sensitive content detected - composer enabled, send disabled', () => {
      composer.value = 'My password is MySecret123!';
      sendGate.handleContentChange();

      expect(composer.disabled).toBe(false);
      expect(composer.readOnly).toBe(false);
      expect(sendGate.composerEnabled).toBe(true);
      expect(sendBtn.disabled).toBe(true);
      expect(sendGate.sendState.verified).toBe(false);
    });

    // Test 5: Placeholder replacement succeeds: composer enabled, send enabled with placeholders
    it('Test 5: Placeholder replacement succeeds - composer enabled, send enabled with placeholders', async () => {
      composer.value = 'My password is MySecret123!';
      sendGate.handleContentChange();

      const verified = await sendGate.processAndVerifyContent();
      expect(verified).toBe(true);
      expect(composer.disabled).toBe(false);
      expect(composer.readOnly).toBe(false);
      expect(sendBtn.disabled).toBe(false);
      expect(sendGate.sendState.status).toBe('VERIFIED');
      expect(sendGate.sendState.verified).toBe(true);
      expect(composer.value).toMatch(/(PASSWORD=YOUR_PASSWORD|\[PASSWORD\])/);
      expect(composer.value).not.toContain('MySecret123!');
    });

    // Test 6: User modifies verified content: composer enabled, send disabled
    it('Test 6: User modifies verified content - composer enabled, send disabled immediately', async () => {
      // First verify safe content
      composer.value = 'Explain recursion';
      await sendGate.processAndVerifyContent();
      expect(sendBtn.disabled).toBe(false);

      // User modifies content
      composer.value = 'Explain recursion, and my token is github_pat_11AAAAAAA000000000000000000000000000000000000000000000000000000000AAAAAAAAAAAAA';
      sendGate.handleContentChange();

      expect(composer.disabled).toBe(false);
      expect(composer.readOnly).toBe(false);
      expect(sendGate.composerEnabled).toBe(true);
      expect(sendBtn.disabled).toBe(true);
      expect(sendGate.sendState.verified).toBe(false);
    });

    // Test 7: Reverification succeeds: composer enabled, send enabled
    it('Test 7: Reverification succeeds - composer enabled, send enabled', async () => {
      composer.value = 'Explain recursion, and my token is github_pat_11AAAAAAA000000000000000000000000000000000000000000000000000000000AAAAAAAAAAAAA';
      sendGate.handleContentChange();

      const reverified = await sendGate.processAndVerifyContent();
      expect(reverified).toBe(true);
      expect(composer.disabled).toBe(false);
      expect(composer.readOnly).toBe(false);
      expect(sendBtn.disabled).toBe(false);
      expect(sendGate.sendState.status).toBe('VERIFIED');
      expect(sendGate.sendState.verified).toBe(true);
      expect(composer.value).toMatch(/(GITHUB_TOKEN=YOUR_GITHUB_TOKEN|\[API_KEY\]|\[GITHUB_TOKEN\])/);
    });

    // Test 8: Press Enter while unverified: typing/editing remains possible, submission blocked
    it('Test 8: Press Enter while unverified - editing remains possible, submission blocked', () => {
      composer.value = 'Drafting a message with secret sk_test_12345';
      sendGate.handleContentChange();

      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        cancelable: true,
        bubbles: true,
      });
      composer.dispatchEvent(enterEvent);

      // Submission was intercepted & blocked
      expect(enterEvent.defaultPrevented).toBe(true);
      // Composer remains completely typable and enabled
      expect(composer.disabled).toBe(false);
      expect(composer.readOnly).toBe(false);
      expect(sendGate.composerEnabled).toBe(true);
    });

    // Test 9: Paste sensitive content: paste allowed, composer enabled, send disabled -> sanitize -> verify -> send enabled
    it('Test 9: Paste sensitive content - paste allowed, composer enabled, send disabled -> sanitize -> verify -> send enabled', async () => {
      const pasteEvent = new Event('paste', { cancelable: true, bubbles: true });
      composer.dispatchEvent(pasteEvent);

      // Paste itself is NEVER cancelled/blocked
      expect(pasteEvent.defaultPrevented).toBe(false);
      expect(composer.disabled).toBe(false);
      expect(composer.readOnly).toBe(false);

      // Content arrives from paste
      composer.value = 'API_KEY=sk_test_999888777666';
      sendGate.handleContentChange();
      expect(sendBtn.disabled).toBe(true);

      // Pipeline sanitizes & verifies
      const result = await sendGate.processAndVerifyContent();
      expect(result).toBe(true);
      expect(sendBtn.disabled).toBe(false);
      expect(composer.disabled).toBe(false);
      expect(
        composer.value.includes('YOUR_STRIPE_SECRET_KEY') ||
        composer.value.includes('YOUR_API_KEY') ||
        composer.value.includes('[API_KEY]')
      ).toBe(true);
      expect(composer.value).not.toContain('sk_test_999888777666');
    });

    // Test 10: Verification fails: composer enabled, send disabled
    it('Test 10: Verification fails - composer enabled, send disabled', async () => {
      composer.value = 'Secret value to test';
      sendGate.handleContentChange();

      // Force verification failure
      jest.spyOn(sendGate, 'verifyOutgoingPayload').mockReturnValueOnce(false);

      const verified = await sendGate.processAndVerifyContent();
      expect(verified).toBe(false);
      expect(composer.disabled).toBe(false);
      expect(sendBtn.disabled).toBe(true);
      expect(sendGate.sendState.status === 'ERROR' || sendGate.sendState.status === 'FAILED').toBe(true);
      expect(sendGate.sendState.verified).toBe(false);
    });

    // Test 11: Non-AI website: existing behavior unchanged
    it('Test 11: Non-AI website - existing behavior unchanged', () => {
      const result = detector.detectContext('https://google.com');
      expect(result.context).toBe('NORMAL');

      const policy = policyEngine.evaluateContext('https://google.com');
      expect(policy.policy).toBe('ALLOW_PRIVACY_PIPELINE');
      expect(policy.allowAgentActions).toBe(true);
      expect(policy.allowScreenshot).toBe(true);
    });

    // Test 12: Authentication page: existing BLOCK_ALL behavior
    it('Test 12: Authentication page - existing BLOCK_ALL behavior', () => {
      const loginPolicy = policyEngine.evaluateContext('https://example.com/login');
      expect(loginPolicy.context).toBe('AUTHENTICATION');
      expect(loginPolicy.policy).toBe('BLOCK_ALL');
      expect(loginPolicy.allowAgentActions).toBe(false);

      const chatgptLoginPolicy = policyEngine.evaluateContext('https://chatgpt.com/auth/login');
      expect(chatgptLoginPolicy.context).toBe('AUTHENTICATION');
      expect(chatgptLoginPolicy.policy).toBe('BLOCK_ALL');
      expect(chatgptLoginPolicy.allowAgentActions).toBe(false);
    });

    // Test 13: Messaging application: existing BLOCK_ALL behavior
    it('Test 13: Messaging application - existing BLOCK_ALL behavior', () => {
      const waPolicy = policyEngine.evaluateContext('https://web.whatsapp.com');
      expect(waPolicy.context).toBe('MESSAGING');
      expect(waPolicy.policy).toBe('BLOCK_ALL');
      expect(waPolicy.allowAgentActions).toBe(false);

      const discordPolicy = policyEngine.evaluateContext('https://discord.com/channels/@me');
      expect(discordPolicy.context).toBe('MESSAGING');
      expect(discordPolicy.policy).toBe('BLOCK_ALL');
      expect(discordPolicy.allowAgentActions).toBe(false);
    });
  });
});

