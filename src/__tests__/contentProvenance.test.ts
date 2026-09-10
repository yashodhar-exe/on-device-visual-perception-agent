/**
 * contentProvenance.test.ts
 *
 * Comprehensive Regression Suite for Content Provenance & Directional Privacy Boundary
 *
 * Verifies:
 *  - USER INPUT ONLY is sanitized before leaving the browser.
 *  - WEBPAGE-OWNED OUTPUT is NEVER sanitized, never masked, and never altered in DOM.
 *  - AI responses remain 100% untouched.
 *  - Conversation history remains 100% untouched.
 *  - Static documentation, examples, and labels remain untouched.
 *  - MutationObserver never rewrites arbitrary text nodes.
 */

import {
  determineElementProvenance,
  isUserInputElement,
  isAssistantResponse,
  isConversationHistory,
  sanitizeUserOutgoingPayload,
} from '../provenance/contentProvenance';
import { DetectionEngine } from '../detectors/detectionEngine';
import { renderOverlays, redactItems, clearOverlays } from '../content/overlay';
import { AiSendGate } from '../privacy/aiSendGate';
import { validatePayloadBeforeTransmission } from '../privacy/policyEngine';

describe('Content Provenance & Directional Privacy Boundary', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearOverlays();
  });

  afterEach(() => {
    clearOverlays();
    document.body.innerHTML = '';
  });

  // ─── TEST 1 ────────────────────────────────────────────────────────────────
  it('TEST 1: Webpage contains "Contact: 9876543210" -> Expected DOM after extension runs: UNCHANGED', async () => {
    document.body.innerHTML = `
      <div class="webpage-container">
        <h1>Support Portal</h1>
        <p id="contact-info">Contact: 9876543210</p>
      </div>
    `;

    const contactEl = document.getElementById('contact-info')!;
    const originalText = contactEl.textContent;

    // Run DetectionEngine
    const engine = new DetectionEngine();
    const items = await engine.run();

    // Verify item was identified as WEBPAGE_CONTENT
    const phoneItem = items.find((i) => i.value === '9876543210');
    expect(phoneItem).toBeDefined();
    expect(phoneItem?.provenance).toBe('WEBPAGE_CONTENT');

    // Run overlays & redaction pipeline
    renderOverlays(items);
    redactItems(items);

    // DOM must remain completely unchanged
    expect(contactEl.textContent).toBe(originalText);
    expect(contactEl.textContent).toBe('Contact: 9876543210');
    expect(document.body.innerHTML).not.toContain('[PHONE');
    expect(document.body.innerHTML).not.toContain('YOUR_PHONE');
  });

  // ─── TEST 2 ────────────────────────────────────────────────────────────────
  it('TEST 2: User composer contains "Call 9876543210" -> Expected outgoing payload: sanitized with placeholder', async () => {
    document.body.innerHTML = `
      <div class="composer-container">
        <textarea id="prompt-textarea">Call 9876543210</textarea>
        <button data-testid="send-button">Send</button>
      </div>
    `;

    const textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
    expect(determineElementProvenance(textarea)).toBe('USER_INPUT');

    const gate = new AiSendGate();
    gate.init('https://chatgpt.com');

    // Outgoing payload extraction
    const outgoing = gate.getOutgoingPayload();
    expect(outgoing).not.toContain('9876543210');
    expect(outgoing).toMatch(/Call (YOUR_PHONE_NUMBER|\[PHONE\]|\[PHONE_NUMBER\])/);

    // Typing and composer interaction remain fully usable
    expect(gate.isSubmissionAllowed()).toBe(false); // gated until verification
    await gate.processAndVerifyContent();
    expect(gate.isSubmissionAllowed()).toBe(true);

    gate.destroy();
  });

  // ─── TEST 3 ────────────────────────────────────────────────────────────────
  it('TEST 3: Webpage output contains "Email: test@example.com" -> Expected: UNCHANGED', async () => {
    document.body.innerHTML = `
      <section class="author-bio">
        <span class="author-label">Author Details</span>
        <div class="bio-text" id="bio-email">Email: test@example.com</div>
      </section>
    `;

    const bioEl = document.getElementById('bio-email')!;
    const engine = new DetectionEngine();
    const items = await engine.run();

    const emailItem = items.find((i) => i.value === 'test@example.com');
    expect(emailItem).toBeDefined();
    expect(emailItem?.provenance).toBe('WEBPAGE_CONTENT');

    renderOverlays(items);
    redactItems(items);

    // Webpage output is PRESERVED exactly as provided
    expect(bioEl.textContent).toBe('Email: test@example.com');
    expect(bioEl.innerHTML).toBe('Email: test@example.com');
  });

  // ─── TEST 4 ────────────────────────────────────────────────────────────────
  it('TEST 4: User types "My email is test@example.com" -> Expected outgoing payload: "My email is YOUR_EMAIL"', async () => {
    const rawInput = 'My email is test@example.com';
    const { sanitizedText } = sanitizeUserOutgoingPayload(rawInput);

    expect(sanitizedText).not.toContain('test@example.com');
    expect(sanitizedText).toContain('YOUR_EMAIL');
    expect(sanitizedText).toBe('My email is YOUR_EMAIL');
  });

  // ─── TEST 5 ────────────────────────────────────────────────────────────────
  it('TEST 5: Webpage contains an API-key-looking example -> Expected: UNCHANGED', async () => {
    const docExample = 'export OPENAI_API_KEY=sk-proj-abc1234567890abcdef1234567890abcdef12345678';
    document.body.innerHTML = `
      <div class="docs-section">
        <h2>Authentication Example</h2>
        <pre><code id="code-snippet">${docExample}</code></pre>
      </div>
    `;

    const codeEl = document.getElementById('code-snippet')!;
    const engine = new DetectionEngine();
    const items = await engine.run();

    renderOverlays(items);
    redactItems(items);

    // Documentation example must not be mangled or replaced
    expect(codeEl.textContent).toBe(docExample);
  });

  // ─── TEST 6 ────────────────────────────────────────────────────────────────
  it('TEST 6: User enters an API-key-looking secret into AI composer -> Expected: SANITIZED before transmission', async () => {
    document.body.innerHTML = `
      <div class="ai-chat">
        <textarea id="prompt-textarea">Deploy with key sk-proj-usersecret1234567890abcdef1234567890abcdef</textarea>
        <button data-testid="send-button">Send</button>
      </div>
    `;

    const gate = new AiSendGate();
    gate.init('https://chatgpt.com');

    const outgoing = gate.getOutgoingPayload();
    expect(outgoing).not.toContain('sk-proj-usersecret1234567890abcdef1234567890abcdef');
    expect(outgoing).toContain('YOUR_');

    // Validating payload before transmission passes once sanitized
    expect(() => {
      validatePayloadBeforeTransmission({
        taskDescription: outgoing,
        domStructure: '<div></div>',
        accessibilityTree: [],
        url: 'https://chatgpt.com',
      });
    }).not.toThrow();

    gate.destroy();
  });

  // ─── TEST 7 ────────────────────────────────────────────────────────────────
  it('TEST 7: AI generates a response containing a phone number -> Expected: AI response remains unchanged', async () => {
    document.body.innerHTML = `
      <div class="chat-thread">
        <div class="agent-turn" data-message-author-role="assistant">
          <div class="response-content" id="ai-response-text">
            9876543210 is the number you provided.
          </div>
        </div>
      </div>
    `;

    const responseEl = document.getElementById('ai-response-text')!;
    expect(isAssistantResponse(responseEl)).toBe(true);
    expect(determineElementProvenance(responseEl)).toBe('WEBPAGE_CONTENT');

    const engine = new DetectionEngine();
    const items = await engine.run();

    renderOverlays(items);
    redactItems(items);

    // AI generated response remains strictly untouched
    expect(responseEl.textContent?.trim()).toBe('9876543210 is the number you provided.');
  });

  // ─── TEST 8 ────────────────────────────────────────────────────────────────
  it('TEST 8: Conversation history contains sensitive-looking strings -> Expected: Conversation history remains unchanged', async () => {
    document.body.innerHTML = `
      <div class="chat-history" data-testid="conversation-history">
        <div class="conversation-item user-message" id="historical-user">
          My phone number is 9876543210
        </div>
        <div class="conversation-item assistant-message" id="historical-assistant">
          The number you provided was 9876543210.
        </div>
      </div>
    `;

    const histUser = document.getElementById('historical-user')!;
    const histAssistant = document.getElementById('historical-assistant')!;

    expect(isConversationHistory(histUser)).toBe(true);
    expect(isConversationHistory(histAssistant)).toBe(true);

    const engine = new DetectionEngine();
    const items = await engine.run();

    renderOverlays(items);
    redactItems(items);

    expect(histUser.textContent?.trim()).toBe('My phone number is 9876543210');
    expect(histAssistant.textContent?.trim()).toBe('The number you provided was 9876543210.');
  });

  // ─── TEST 9 ────────────────────────────────────────────────────────────────
  it('TEST 9: User edits an existing composer containing sensitive content -> Expected: Only current user-controlled composer is processed', async () => {
    document.body.innerHTML = `
      <div class="chat-history">
        <div class="assistant-message">Previous answer was 9876543210.</div>
      </div>
      <div class="composer-container">
        <textarea id="prompt-textarea">Original prompt</textarea>
      </div>
    `;

    const textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
    const historyEl = document.querySelector('.assistant-message')!;

    // User updates composer text to include sensitive data
    textarea.value = 'New contact 9876543210 for billing';

    const gate = new AiSendGate();
    gate.init('https://chatgpt.com');

    // Only composer is processed
    const outgoing = gate.getOutgoingPayload();
    expect(outgoing).not.toContain('9876543210');
    expect(outgoing).toMatch(/(YOUR_PHONE_NUMBER|\[PHONE_NUMBER\])/);

    // History is completely unchanged
    expect(historyEl.textContent).toBe('Previous answer was 9876543210.');

    gate.destroy();
  });

  // ─── TEST 10 ───────────────────────────────────────────────────────────────
  it('TEST 10: MutationObserver sees a newly rendered AI response containing a phone number -> Expected: No modification of response', async () => {
    document.body.innerHTML = `
      <div class="chat-container">
        <div id="thread"></div>
      </div>
    `;

    const thread = document.getElementById('thread')!;

    // Simulate AI dynamically streaming/rendering new response into DOM
    const newAiMessage = document.createElement('div');
    newAiMessage.className = 'agent-turn';
    newAiMessage.setAttribute('data-message-author-role', 'assistant');
    newAiMessage.innerHTML = '<p class="ai-text">Here is your verification code: 8765432109</p>';
    thread.appendChild(newAiMessage);

    const engine = new DetectionEngine();
    const roots = [thread];
    const items = await engine.runOnRoots(roots);

    // Pipeline execution
    renderOverlays(items);
    redactItems(items);

    const textNode = newAiMessage.querySelector('.ai-text')!;
    expect(textNode.textContent).toBe('Here is your verification code: 8765432109');
    expect(textNode.innerHTML).toBe('Here is your verification code: 8765432109');
  });
});
