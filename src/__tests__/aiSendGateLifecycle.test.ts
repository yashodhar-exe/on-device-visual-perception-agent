/**
 * aiSendGateLifecycle.test.ts
 *
 * Direct validation suite for the 9-state Send Button Rendering & Privacy Lifecycle:
 *
 * STATE 1: Empty composer -> Send button: native website behavior
 * STATE 2: Normal text -> Send: VISIBLE + ENABLED
 * STATE 3: Sensitive text detected -> Send: VISIBLE + temporarily DISABLED
 * STATE 4: Sensitive text successfully sanitized -> Send: VISIBLE + ENABLED
 * STATE 5: Sanitization failure -> Send: VISIBLE + DISABLED
 * STATE 6: User removes sensitive content -> Send: VISIBLE + ENABLED if otherwise safe
 * STATE 7: User edits sanitized content -> Revalidate current content
 * STATE 8: Image processing -> Send: VISIBLE + DISABLED while processing
 * STATE 9: Image sanitized and verified -> Send: VISIBLE + ENABLED
 *
 * Invariant:
 * The Send button must ALWAYS remain visible in the DOM throughout every state.
 * Never display:none, never visibility:hidden, never opacity:0, never pointer-events:none.
 */

import { AiSendGate } from '../privacy/aiSendGate';
import { AttachmentInterceptor } from '../visualPrivacy/attachmentInterceptor';

describe('AI Send Gate — 9-State Send Button Lifecycle', () => {
  let sendGate: AiSendGate;
  let mockAttachmentInterceptor: AttachmentInterceptor;
  let composer: HTMLTextAreaElement;
  let sendBtn: HTMLButtonElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="composer-container">
        <form class="chat-form">
          <textarea id="prompt-textarea" placeholder="Message ChatGPT..."></textarea>
          <button type="submit" data-testid="send-button" aria-label="Send prompt">
            <svg class="send-icon"><path d="M0 0h24v24H0z"></path></svg>
          </button>
        </form>
      </div>
    `;

    sendGate = new AiSendGate();
    mockAttachmentInterceptor = new AttachmentInterceptor();
    sendGate.attachmentInterceptor = mockAttachmentInterceptor;

    composer = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
    sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;

    sendGate.init('https://chatgpt.com');
  });

  afterEach(() => {
    sendGate.destroy();
    document.body.innerHTML = '';
  });

  // Helper to assert Send Button is ALWAYS visible
  function assertSendButtonVisible() {
    expect(sendBtn).toBeDefined();
    expect(document.body.contains(sendBtn)).toBe(true);
    expect(sendBtn.style.display).not.toBe('none');
    expect(sendBtn.style.visibility).not.toBe('hidden');
    expect(sendBtn.style.opacity).not.toBe('0');
    expect(sendBtn.style.opacity).not.toBe('0.4');
    expect(sendBtn.style.pointerEvents).not.toBe('none');
  }

  it('STATE 1: Empty composer — Send button remains visible without invasive styles', () => {
    composer.value = '';
    sendGate.handleContentChange();

    assertSendButtonVisible();
    expect(sendGate.isSubmissionAllowed()).toBe(false);
  });

  it('STATE 2: Normal text — Send: VISIBLE + ENABLED', async () => {
    composer.value = 'Explain the difference between Dijkstra and A* search';
    sendGate.handleContentChange(true);

    const verified = await sendGate.processAndVerifyContent();
    expect(verified).toBe(true);

    assertSendButtonVisible();
    expect(sendBtn.disabled).toBe(false);
    expect(sendGate.isSubmissionAllowed()).toBe(true);
  });

  it('STATE 3: Sensitive text detected — Send: VISIBLE + temporarily DISABLED', () => {
    composer.value = '9954634442';
    // User typed, analysis starts
    sendGate.handleContentChange();

    assertSendButtonVisible();
    expect(sendBtn.disabled).toBe(true);
    expect(sendGate.isSubmissionAllowed()).toBe(false);
  });

  it('STATE 4: Sensitive text successfully sanitized — Send: VISIBLE + ENABLED with [PHONE_NUMBER]', async () => {
    composer.value = '9954634442';
    sendGate.handleContentChange();

    const verified = await sendGate.processAndVerifyContent();
    expect(verified).toBe(true);

    assertSendButtonVisible();
    expect(composer.value).toBe('[PHONE_NUMBER]');
    expect(composer.value).not.toContain('9954634442');
    expect(sendBtn.disabled).toBe(false);
    expect(sendGate.isSubmissionAllowed()).toBe(true);

    const badge = document.getElementById('__pf_ai_send_gate_badge__');
    expect(badge?.textContent).toBe('🔒 Sensitive information protected locally');
  });

  it('STATE 5: Sanitization failure — Send: VISIBLE + DISABLED', async () => {
    composer.value = 'Secret raw payload';
    // Mock failure by spying on verifyOutgoingPayload to simulate verification rejection
    jest.spyOn(sendGate, 'verifyOutgoingPayload').mockReturnValue(false);

    const verified = await sendGate.processAndVerifyContent();
    expect(verified).toBe(false);

    assertSendButtonVisible();
    expect(sendBtn.disabled).toBe(true);
    expect(sendGate.isSubmissionAllowed()).toBe(false);

    const badge = document.getElementById('__pf_ai_send_gate_badge__');
    expect(badge?.textContent).toBe('🔒 Unable to protect sensitive information — sending blocked');
  });

  it('STATE 6: User removes sensitive content — Send: VISIBLE + ENABLED', async () => {
    // 1. Initial sensitive input
    composer.value = '9954634442';
    sendGate.handleContentChange();
    expect(sendBtn.disabled).toBe(true);

    // 2. User clears and enters safe text
    composer.value = 'Hello world, this is a completely safe prompt';
    sendGate.handleContentChange(true);

    const verified = await sendGate.processAndVerifyContent();
    expect(verified).toBe(true);

    assertSendButtonVisible();
    expect(sendBtn.disabled).toBe(false);
    expect(sendGate.isSubmissionAllowed()).toBe(true);
  });

  it('STATE 7: User edits sanitized content — Revalidates properly', async () => {
    // 1. Initial sanitization
    composer.value = 'Contact me at 9954634442';
    sendGate.handleContentChange(true);
    await sendGate.processAndVerifyContent();
    expect(composer.value).toBe('Contact me at [PHONE_NUMBER]');
    expect(sendBtn.disabled).toBe(false);

    // 2. User appends new clean text
    composer.value = 'Contact me at [PHONE_NUMBER] tomorrow morning';
    sendGate.handleContentChange(true);
    const verified = await sendGate.processAndVerifyContent();
    expect(verified).toBe(true);

    assertSendButtonVisible();
    expect(sendBtn.disabled).toBe(false);
    expect(sendGate.isSubmissionAllowed()).toBe(true);
  });

  it('STATE 8: Image processing — Send: VISIBLE + DISABLED while processing', () => {
    // Normal text entered
    composer.value = 'Look at this picture';
    sendGate.handleContentChange(true);

    // Image attachment is currently PROCESSING
    jest.spyOn(mockAttachmentInterceptor, 'getAttachmentPrivacyState').mockReturnValue('PROCESSING');

    const allowed = sendGate.isSubmissionAllowed();
    expect(allowed).toBe(false);

    sendGate.evaluateSendAllowed();
    assertSendButtonVisible();
    expect(sendBtn.disabled).toBe(true);
  });

  it('STATE 9: Image sanitized and verified — Send: VISIBLE + ENABLED', async () => {
    composer.value = 'Look at this picture';
    sendGate.handleContentChange(true);
    await sendGate.processAndVerifyContent();

    // Image attachment is verified
    jest.spyOn(mockAttachmentInterceptor, 'getAttachmentPrivacyState').mockReturnValue('VERIFIED');

    const allowed = sendGate.isSubmissionAllowed();
    expect(allowed).toBe(true);

    sendGate.evaluateSendAllowed();
    assertSendButtonVisible();
    expect(sendBtn.disabled).toBe(false);
  });
});
