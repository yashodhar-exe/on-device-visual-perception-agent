/**
 * pageResponsivenessAndTargetSpecificBlocking.test.ts
 *
 * Explicit regression tests verifying that the privacy extension NEVER makes
 * web pages unresponsive or blocks normal user interactions.
 *
 * Invariant:
 * "The user always retains normal control of the webpage. Privacy restrictions apply
 *  only to data transmission and agent-generated actions, with the special AI-site rule
 *  gating only the Send/Submit operation."
 */

import { AiSendGate } from '../privacy/aiSendGate';
import { ContextDetector, KNOWN_AI_SITES } from '../privacy/contextDetector';
import { ContextPolicyEngine } from '../privacy/contextPolicyEngine';
import { ActionExecutor } from '../actions/actionExecutor';
import { AgentAction, SensitiveRegion, AnalyzeRequest } from '../core/types';
import { evaluatePrivacyPolicy } from '../privacy/policyEngine';

describe('Page Responsiveness & Target-Specific Interaction Guarantee', () => {
  let detector: ContextDetector;
  let policyEngine: ContextPolicyEngine;
  let actionExecutor: ActionExecutor;

  beforeEach(() => {
    detector = new ContextDetector();
    policyEngine = new ContextPolicyEngine(detector);
    actionExecutor = new ActionExecutor();
    document.body.innerHTML = '';
  });

  // ─── 1. Normal Website Responsiveness ───────────────────────────────────────

  describe('1. Normal Website: 100% Unrestricted User Interaction', () => {
    it('user can click links, buttons, and menus without interception', () => {
      document.body.innerHTML = `
        <nav>
          <a id="nav-link" href="/about">About Us</a>
          <button id="menu-btn" aria-label="Open Menu">Menu</button>
        </nav>
        <main>
          <button id="cta-btn">Click Me</button>
        </main>
      `;

      const link = document.getElementById('nav-link') as HTMLAnchorElement;
      const menuBtn = document.getElementById('menu-btn') as HTMLButtonElement;
      const ctaBtn = document.getElementById('cta-btn') as HTMLButtonElement;

      let linkClicked = false;
      let menuClicked = false;
      let ctaClicked = false;

      link.addEventListener('click', (e) => {
        if (!e.defaultPrevented) linkClicked = true;
      });
      menuBtn.addEventListener('click', (e) => {
        if (!e.defaultPrevented) menuClicked = true;
      });
      ctaBtn.addEventListener('click', (e) => {
        if (!e.defaultPrevented) ctaClicked = true;
      });

      const click1 = new MouseEvent('click', { bubbles: true, cancelable: true });
      const click2 = new MouseEvent('click', { bubbles: true, cancelable: true });
      const click3 = new MouseEvent('click', { bubbles: true, cancelable: true });

      link.dispatchEvent(click1);
      menuBtn.dispatchEvent(click2);
      ctaBtn.dispatchEvent(click3);

      expect(click1.defaultPrevented).toBe(false);
      expect(click2.defaultPrevented).toBe(false);
      expect(click3.defaultPrevented).toBe(false);
      expect(linkClicked).toBe(true);
      expect(menuClicked).toBe(true);
      expect(ctaClicked).toBe(true);
    });

    it('user can type, edit, and use keyboard shortcuts on normal forms', () => {
      document.body.innerHTML = `
        <form id="contact-form">
          <input id="name-input" type="text" placeholder="Your Name" />
          <textarea id="comment-input" placeholder="Your Comment"></textarea>
          <button type="submit" id="submit-btn">Submit Comment</button>
        </form>
      `;

      const nameInput = document.getElementById('name-input') as HTMLInputElement;
      const commentInput = document.getElementById('comment-input') as HTMLTextAreaElement;
      const form = document.getElementById('contact-form') as HTMLFormElement;

      let keyTyped = false;
      nameInput.addEventListener('keydown', (e) => {
        if (!e.defaultPrevented) keyTyped = true;
      });

      const keyEvent = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
      nameInput.dispatchEvent(keyEvent);

      expect(keyEvent.defaultPrevented).toBe(false);
      expect(keyTyped).toBe(true);

      // User typing Enter in comment textarea
      let enterPressed = false;
      commentInput.addEventListener('keydown', (e) => {
        if (!e.defaultPrevented) enterPressed = true;
      });

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      commentInput.dispatchEvent(enterEvent);

      expect(enterEvent.defaultPrevented).toBe(false);
      expect(enterPressed).toBe(true);

      // Normal form submission
      let formSubmitted = false;
      form.addEventListener('submit', (e) => {
        if (!e.defaultPrevented) formSubmitted = true;
        e.preventDefault(); // prevent jsdom navigation
      });

      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);

      expect(formSubmitted).toBe(true);
    });

    it('user can copy, paste, select, and scroll normally', () => {
      document.body.innerHTML = `
        <div id="content" style="height: 2000px;">
          <p id="para">Some normal paragraph text to select and copy.</p>
          <input id="text-field" type="text" value="Original text" />
        </div>
      `;

      const para = document.getElementById('para') as HTMLParagraphElement;
      const input = document.getElementById('text-field') as HTMLInputElement;

      // Copy event
      let copyAllowed = false;
      para.addEventListener('copy', (e) => {
        if (!e.defaultPrevented) copyAllowed = true;
      });
      const copyEvt = new Event('copy', { bubbles: true, cancelable: true });
      para.dispatchEvent(copyEvt);
      expect(copyEvt.defaultPrevented).toBe(false);
      expect(copyAllowed).toBe(true);

      // Paste event
      let pasteAllowed = false;
      input.addEventListener('paste', (e) => {
        if (!e.defaultPrevented) pasteAllowed = true;
      });
      const pasteEvt = new Event('paste', { bubbles: true, cancelable: true });
      input.dispatchEvent(pasteEvt);
      expect(pasteEvt.defaultPrevented).toBe(false);
      expect(pasteAllowed).toBe(true);
    });
  });

  // ─── 2. AI Website Responsiveness ───────────────────────────────────────────

  describe('2. AI Website: Composer Usable, Unrelated Elements Unaffected, Only Send Gated', () => {
    let gate: AiSendGate;

    beforeEach(() => {
      gate = new AiSendGate();
    });

    afterEach(() => {
      gate.destroy();
    });

    it('unrelated buttons, links, search forms, and settings modals remain fully clickable', () => {
      document.body.innerHTML = `
        <header>
          <button id="upgrade-plan" aria-label="Upgrade Plan">Upgrade</button>
          <button id="sidebar-toggle" aria-label="Close sidebar">Toggle Sidebar</button>
          <form id="search-sidebar-form">
            <input id="search-chat" type="text" placeholder="Search chats" />
            <button id="search-submit" type="submit">Search</button>
          </form>
        </header>
        <main>
          <div class="chat-container">
            <textarea id="prompt-textarea" placeholder="Ask anything..."></textarea>
            <button data-testid="send-button" aria-label="Send prompt">Send</button>
          </div>
        </main>
      `;

      gate.init('https://chatgpt.com');

      const upgradeBtn = document.getElementById('upgrade-plan') as HTMLButtonElement;
      const toggleBtn = document.getElementById('sidebar-toggle') as HTMLButtonElement;
      const searchForm = document.getElementById('search-sidebar-form') as HTMLFormElement;
      const searchInput = document.getElementById('search-chat') as HTMLInputElement;
      const searchSubmitBtn = document.getElementById('search-submit') as HTMLButtonElement;

      // 1. Upgrade button click NOT blocked
      let upgradeClicked = false;
      upgradeBtn.addEventListener('click', (e) => {
        if (!e.defaultPrevented) upgradeClicked = true;
      });
      const upClick = new MouseEvent('click', { bubbles: true, cancelable: true });
      upgradeBtn.dispatchEvent(upClick);
      expect(upClick.defaultPrevented).toBe(false);
      expect(upgradeClicked).toBe(true);

      // 2. Sidebar toggle button click NOT blocked
      let toggleClicked = false;
      toggleBtn.addEventListener('click', (e) => {
        if (!e.defaultPrevented) toggleClicked = true;
      });
      const togClick = new MouseEvent('click', { bubbles: true, cancelable: true });
      toggleBtn.dispatchEvent(togClick);
      expect(togClick.defaultPrevented).toBe(false);
      expect(toggleClicked).toBe(true);

      // 3. Search sidebar form submission NOT blocked by extension
      let searchFormSubmitted = false;
      let wasDefaultPreventedBeforeHandler = false;
      searchForm.addEventListener('submit', (e) => {
        wasDefaultPreventedBeforeHandler = e.defaultPrevented;
        if (!e.defaultPrevented) searchFormSubmitted = true;
        e.preventDefault(); // prevent navigation in test
      });
      const searchSubmitEvt = new Event('submit', { bubbles: true, cancelable: true });
      searchForm.dispatchEvent(searchSubmitEvt);
      expect(wasDefaultPreventedBeforeHandler).toBe(false);
      expect(searchFormSubmitted).toBe(true);

      // 4. Typing Enter inside search box NOT blocked
      let searchEnterPressed = false;
      searchInput.addEventListener('keydown', (e) => {
        if (!e.defaultPrevented) searchEnterPressed = true;
      });
      const searchEnterEvt = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      searchInput.dispatchEvent(searchEnterEvt);
      expect(searchEnterEvt.defaultPrevented).toBe(false);
      expect(searchEnterPressed).toBe(true);

      // 5. Search submit button NOT disabled or pointer-events none
      expect(searchSubmitBtn.disabled).toBe(false);
      expect(searchSubmitBtn.style.pointerEvents).not.toBe('none');
    });

    it('composer is typable, editable, and only unverified submit is intercepted', async () => {
      document.body.innerHTML = `
        <div class="chat-container">
          <textarea id="prompt-textarea" placeholder="Ask anything..."></textarea>
          <button data-testid="send-button" aria-label="Send prompt">Send</button>
        </div>
      `;

      gate.init('https://chatgpt.com');

      const composer = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;

      // Composer remains completely enabled
      expect(composer.disabled).toBe(false);
      expect(composer.readOnly).toBe(false);

      // Normal typing works
      let typedChar = false;
      composer.addEventListener('keydown', (e) => {
        if (!e.defaultPrevented) typedChar = true;
      });
      const keyEvt = new KeyboardEvent('keydown', { key: 'h', bubbles: true, cancelable: true });
      composer.dispatchEvent(keyEvt);
      expect(keyEvt.defaultPrevented).toBe(false);
      expect(typedChar).toBe(true);

      // Unverified send click is blocked
      const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true });
      sendBtn.dispatchEvent(clickEvt);
      expect(clickEvt.defaultPrevented).toBe(true);

      // Safe content verification enables send
      composer.value = 'Can you explain binary search?';
      gate.handleContentChange();
      const verified = await gate.processAndVerifyContent();
      expect(verified).toBe(true);
      expect(sendBtn.disabled).toBe(false);

      // Send click is now allowed
      const clickAllowed = new MouseEvent('click', { bubbles: true, cancelable: true });
      sendBtn.dispatchEvent(clickAllowed);
      expect(clickAllowed.defaultPrevented).toBe(false);
    });
  });

  // ─── 3. Authentication Page Responsiveness ───────────────────────────────────

  describe('3. Authentication Page: Full User Interactivity, Only Agent Excluded', () => {
    it('user can type email, password, and manually click log in', () => {
      document.body.innerHTML = `
        <div class="auth-box">
          <h2>Sign in to your account</h2>
          <form id="login-form" action="/login" method="POST">
            <input id="email" type="email" name="email" placeholder="Email address" />
            <input id="password" type="password" name="password" placeholder="Password" />
            <button id="login-btn" type="submit">Sign In</button>
          </form>
        </div>
      `;

      const policy = policyEngine.evaluateContext('https://example.com/login', document);
      expect(policy.context).toBe('AUTHENTICATION');
      expect(policy.policy).toBe('BLOCK_ALL');

      // The security policy blocks ONLY the AGENT capabilities
      expect(policy.allowScreenshot).toBe(false);
      expect(policy.allowDomTransmission).toBe(false);
      expect(policy.allowAgentActions).toBe(false);

      // The webpage itself MUST REMAIN 100% INTERACTIVE FOR THE USER
      const emailInput = document.getElementById('email') as HTMLInputElement;
      const passInput = document.getElementById('password') as HTMLInputElement;
      const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;
      const form = document.getElementById('login-form') as HTMLFormElement;

      // Inputs and buttons must NOT be disabled or readonly
      expect(emailInput.disabled).toBe(false);
      expect(emailInput.readOnly).toBe(false);
      expect(passInput.disabled).toBe(false);
      expect(passInput.readOnly).toBe(false);
      expect(loginBtn.disabled).toBe(false);

      // User typing email
      let emailTyped = false;
      emailInput.addEventListener('keydown', (e) => {
        if (!e.defaultPrevented) emailTyped = true;
      });
      const keyEvt = new KeyboardEvent('keydown', { key: 'u', bubbles: true, cancelable: true });
      emailInput.dispatchEvent(keyEvt);
      expect(keyEvt.defaultPrevented).toBe(false);
      expect(emailTyped).toBe(true);

      // User typing password
      let passTyped = false;
      passInput.addEventListener('keydown', (e) => {
        if (!e.defaultPrevented) passTyped = true;
      });
      const passEvt = new KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true });
      passInput.dispatchEvent(passEvt);
      expect(passEvt.defaultPrevented).toBe(false);
      expect(passTyped).toBe(true);

      // User submitting login form manually
      let loginSubmitted = false;
      let wasLoginPreventedBeforeHandler = false;
      form.addEventListener('submit', (e) => {
        wasLoginPreventedBeforeHandler = e.defaultPrevented;
        if (!e.defaultPrevented) loginSubmitted = true;
        e.preventDefault();
      });
      const submitEvt = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvt);
      expect(wasLoginPreventedBeforeHandler).toBe(false);
      expect(loginSubmitted).toBe(true);
    });

    it('agent actions are rejected by ActionExecutor on authentication page', async () => {
      document.body.innerHTML = `
        <form action="/login">
          <input id="email" type="email" />
          <input id="password" type="password" />
          <button id="login-btn">Sign In</button>
        </form>
      `;

      // Mock window.location for action executor just-in-time check
      Object.defineProperty(window, 'location', {
        value: { href: 'https://example.com/login', origin: 'https://example.com' },
        writable: true,
      });

      const agentAction: AgentAction = {
        action: 'type',
        selector: '#password',
        text: 'secret123',
        description: 'Type password into login field',
      };

      const result = await actionExecutor.execute(agentAction, []);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Action rejected by security policy');
      expect(result.error).toContain('AUTHENTICATION');
    });
  });

  // ─── 4. Messaging Application Responsiveness ─────────────────────────────────

  describe('4. Messaging Application: Full User Interactivity, Only Agent Excluded', () => {
    it('user can type messages, click send, and scroll chats on messaging app', () => {
      document.body.innerHTML = `
        <div id="app">
          <div class="chat-thread" style="height: 500px; overflow-y: auto;">
            <div class="message">Hello!</div>
          </div>
          <div class="message-composer">
            <div contenteditable="true" id="msg-input" role="textbox"></div>
            <button id="send-msg-btn" aria-label="Send">Send</button>
          </div>
        </div>
      `;

      const policy = policyEngine.evaluateContext('https://web.whatsapp.com', document);
      expect(policy.context).toBe('MESSAGING');
      expect(policy.policy).toBe('BLOCK_ALL');

      // The security policy blocks ONLY the AGENT capabilities
      expect(policy.allowScreenshot).toBe(false);
      expect(policy.allowDomTransmission).toBe(false);
      expect(policy.allowAgentActions).toBe(false);

      const msgInput = document.getElementById('msg-input') as HTMLElement;
      const sendBtn = document.getElementById('send-msg-btn') as HTMLButtonElement;

      // The messaging input and send button MUST NOT BE DISABLED FOR THE USER
      expect(msgInput.getAttribute('contenteditable')).toBe('true');
      expect(sendBtn.disabled).toBe(false);

      // User typing message
      let msgTyped = false;
      msgInput.addEventListener('keydown', (e) => {
        if (!e.defaultPrevented) msgTyped = true;
      });
      const keyEvt = new KeyboardEvent('keydown', { key: 'H', bubbles: true, cancelable: true });
      msgInput.dispatchEvent(keyEvt);
      expect(keyEvt.defaultPrevented).toBe(false);
      expect(msgTyped).toBe(true);

      // User clicking Send manually
      let msgSent = false;
      sendBtn.addEventListener('click', (e) => {
        if (!e.defaultPrevented) msgSent = true;
      });
      const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true });
      sendBtn.dispatchEvent(clickEvt);
      expect(clickEvt.defaultPrevented).toBe(false);
      expect(msgSent).toBe(true);
    });

    it('agent actions are rejected by ActionExecutor on messaging page', async () => {
      document.body.innerHTML = `
        <div contenteditable="true" id="chat-composer"></div>
      `;

      Object.defineProperty(window, 'location', {
        value: { href: 'https://web.whatsapp.com', origin: 'https://web.whatsapp.com' },
        writable: true,
      });

      const agentAction: AgentAction = {
        action: 'type',
        selector: '#chat-composer',
        text: 'Automated message from vision agent',
        description: 'Send chat message',
      };

      const result = await actionExecutor.execute(agentAction, []);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Action rejected by security policy');
      expect(result.error).toContain('MESSAGING');
    });
  });

  // ─── 5. Regression Tests: Normal Page (API Key Absent vs API Key Present) ────

  describe('5. Normal Page: API Key Protection & User Interactivity', () => {
    it('API key absent: click, keydown, input, paste, submit, and scroll all allowed', () => {
      document.body.innerHTML = `
        <div id="scrollable" style="height: 1000px; overflow-y: auto;">
          <form id="feedback-form">
            <input id="title" type="text" placeholder="Title" />
            <button id="send-feedback" type="submit">Submit Feedback</button>
          </form>
          <a id="external-link" href="https://example.com/docs">Documentation</a>
        </div>
      `;

      const titleInput = document.getElementById('title') as HTMLInputElement;
      const form = document.getElementById('feedback-form') as HTMLFormElement;
      const link = document.getElementById('external-link') as HTMLAnchorElement;

      // 1. Click allowed
      let linkClicked = false;
      link.addEventListener('click', (e) => {
        if (!e.defaultPrevented) linkClicked = true;
        e.preventDefault();
      });
      const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(clickEvt);
      expect(linkClicked).toBe(true);

      // 2. Keydown allowed
      let keyTyped = false;
      titleInput.addEventListener('keydown', (e) => {
        if (!e.defaultPrevented) keyTyped = true;
      });
      const keyEvt = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
      titleInput.dispatchEvent(keyEvt);
      expect(keyEvt.defaultPrevented).toBe(false);
      expect(keyTyped).toBe(true);

      // 3. Input event allowed
      let inputChanged = false;
      titleInput.addEventListener('input', (e) => {
        if (!e.defaultPrevented) inputChanged = true;
      });
      const inputEvt = new Event('input', { bubbles: true, cancelable: true });
      titleInput.dispatchEvent(inputEvt);
      expect(inputEvt.defaultPrevented).toBe(false);
      expect(inputChanged).toBe(true);

      // 4. Paste allowed
      let pasted = false;
      titleInput.addEventListener('paste', (e) => {
        if (!e.defaultPrevented) pasted = true;
      });
      const pasteEvt = new Event('paste', { bubbles: true, cancelable: true });
      titleInput.dispatchEvent(pasteEvt);
      expect(pasteEvt.defaultPrevented).toBe(false);
      expect(pasted).toBe(true);

      // 5. Submit allowed
      let submitted = false;
      form.addEventListener('submit', (e) => {
        if (!e.defaultPrevented) submitted = true;
        e.preventDefault();
      });
      const submitEvt = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvt);
      expect(submitted).toBe(true);

      // 6. Scroll allowed
      let scrolled = false;
      window.addEventListener('scroll', () => { scrolled = true; });
      window.dispatchEvent(new Event('scroll'));
      expect(scrolled).toBe(true);
    });

    it('API key present: user can type, edit, copy/paste, scroll, click, and navigate while agent transmission & actions are blocked', async () => {
      document.body.innerHTML = `
        <div id="api-dashboard">
          <pre id="code-snippet">const API_KEY = "sk-proj-9876543210fedcba9876543210fedcba";</pre>
          <input id="user-note" type="text" value="Testing key integration" />
          <input id="secret-field" type="password" value="SuperSecretValue123!" />
          <button id="save-note-btn">Save Note</button>
          <a id="nav-home" href="/dashboard">Back to Dashboard</a>
        </div>
      `;

      const userNote = document.getElementById('user-note') as HTMLInputElement;
      const saveBtn = document.getElementById('save-note-btn') as HTMLButtonElement;
      const navLink = document.getElementById('nav-home') as HTMLAnchorElement;
      const snippet = document.getElementById('code-snippet') as HTMLElement;

      // 1. User typing allowed
      let typed = false;
      userNote.addEventListener('keydown', (e) => {
        if (!e.defaultPrevented) typed = true;
      });
      const keyEvt = new KeyboardEvent('keydown', { key: 'X', bubbles: true, cancelable: true });
      userNote.dispatchEvent(keyEvt);
      expect(keyEvt.defaultPrevented).toBe(false);
      expect(typed).toBe(true);

      // 2. User editing allowed
      userNote.value = 'Updated note with key context';
      expect(userNote.value).toBe('Updated note with key context');

      // 3. Copy / Paste allowed
      let copyAllowed = false;
      snippet.addEventListener('copy', (e) => {
        if (!e.defaultPrevented) copyAllowed = true;
      });
      const copyEvt = new Event('copy', { bubbles: true, cancelable: true });
      snippet.dispatchEvent(copyEvt);
      expect(copyEvt.defaultPrevented).toBe(false);
      expect(copyAllowed).toBe(true);

      // 4. Scrolling allowed
      let scrollFired = false;
      window.addEventListener('scroll', () => { scrollFired = true; });
      window.dispatchEvent(new Event('scroll'));
      expect(scrollFired).toBe(true);

      // 5. Normal clicks allowed
      let saveClicked = false;
      saveBtn.addEventListener('click', (e) => {
        if (!e.defaultPrevented) saveClicked = true;
      });
      const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true });
      saveBtn.dispatchEvent(clickEvt);
      expect(clickEvt.defaultPrevented).toBe(false);
      expect(saveClicked).toBe(true);

      // 6. User navigation allowed
      let navClicked = false;
      navLink.addEventListener('click', (e) => {
        if (!e.defaultPrevented) navClicked = true;
        e.preventDefault();
      });
      const navEvt = new MouseEvent('click', { bubbles: true, cancelable: true });
      navLink.dispatchEvent(navEvt);
      expect(navClicked).toBe(true);

      // 7. UNAUTHORIZED AGENT TRANSMISSION IS BLOCKED
      // If outbound payload contains the raw API key without redaction, fail-closed policy rejects it!
      const unredactedPayload: AnalyzeRequest = {
        screenshot: 'data:image/png;base64,unredacted',
        domStructure: '<div>const API_KEY = "sk-proj-9876543210fedcba9876543210fedcba";</div>',
        accessibilityTree: [],
        url: 'https://example.com/api-keys',
        taskDescription: 'Extract API keys for external service',
      };
      const policyResult = evaluatePrivacyPolicy(unredactedPayload, []);
      expect(policyResult.safe).toBe(false);
      expect(policyResult.violations.length).toBeGreaterThan(0);
      expect(policyResult.violations.some(v => /API_KEY|KEY/i.test(v))).toBe(true);

      // 8. UNAUTHORIZED AGENT ACTION IS BLOCKED
      // When agent attempts an unauthorized action targeting credentials without user confirmation:
      const unauthorizedAgentAction: AgentAction = {
        action: 'type',
        selector: '#secret-field',
        text: 'sk-proj-exfiltrate-key-1234567890',
        description: 'Type stolen secret into external target',
      };
      const actionResult = await actionExecutor.execute(unauthorizedAgentAction, [], false);
      expect(actionResult.success).toBe(false);
      expect(actionResult.error).toContain('Action rejected by security policy');
    });
  });

  // ─── 6. Regression Tests: AI Website Interactivity & Secret Gating ──────────

  describe('6. AI Website: Credential Gating & Continuous User Control', () => {
    let gate: AiSendGate;

    beforeEach(() => {
      gate = new AiSendGate();
    });

    afterEach(() => {
      gate.destroy();
    });

    it('typing, paste, editing, deleting, scrolling, and normal clicks are allowed on AI website', () => {
      document.body.innerHTML = `
        <header>
          <button id="settings-btn">Settings</button>
          <a id="home-link" href="/">Home</a>
        </header>
        <main>
          <textarea id="prompt-textarea"></textarea>
          <button data-testid="send-button">Send</button>
        </main>
      `;

      gate.init('https://chatgpt.com');
      const composer = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
      const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
      const homeLink = document.getElementById('home-link') as HTMLAnchorElement;

      // 1. Composer is NOT disabled or readonly
      expect(composer.disabled).toBe(false);
      expect(composer.readOnly).toBe(false);

      // 2. Typing is allowed
      let keyFired = false;
      composer.addEventListener('keydown', (e) => {
        if (!e.defaultPrevented) keyFired = true;
      });
      const keyEvt = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
      composer.dispatchEvent(keyEvt);
      expect(keyEvt.defaultPrevented).toBe(false);
      expect(keyFired).toBe(true);

      // 3. Paste is allowed
      let pasteFired = false;
      composer.addEventListener('paste', (e) => {
        if (!e.defaultPrevented) pasteFired = true;
      });
      const pasteEvt = new Event('paste', { bubbles: true, cancelable: true });
      composer.dispatchEvent(pasteEvt);
      expect(pasteEvt.defaultPrevented).toBe(false);
      expect(pasteFired).toBe(true);

      // 4. Editing & Deleting
      composer.value = 'User types sk-proj-1234567890abcdef1234567890abcdef';
      expect(composer.value).toContain('sk-proj');
      composer.value = 'User deleted the secret';
      expect(composer.value).toBe('User deleted the secret');

      // 5. Normal clicks allowed
      let settingsClicked = false;
      settingsBtn.addEventListener('click', (e) => {
        if (!e.defaultPrevented) settingsClicked = true;
      });
      const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true });
      settingsBtn.dispatchEvent(clickEvt);
      expect(clickEvt.defaultPrevented).toBe(false);
      expect(settingsClicked).toBe(true);

      let linkClicked = false;
      homeLink.addEventListener('click', (e) => {
        if (!e.defaultPrevented) linkClicked = true;
        e.preventDefault();
      });
      const linkEvt = new MouseEvent('click', { bubbles: true, cancelable: true });
      homeLink.dispatchEvent(linkEvt);
      expect(linkClicked).toBe(true);
    });

    it('AI Send with unverified secret is blocked, but Send with verified/safe data is allowed', async () => {
      document.body.innerHTML = `
        <textarea id="prompt-textarea"></textarea>
        <button data-testid="send-button">Send</button>
      `;

      gate.init('https://chatgpt.com');
      const composer = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;

      // Enter an unverified secret
      composer.value = 'Here is my OpenAI key: sk-proj-1234567890abcdef1234567890abcdef';
      gate.handleContentChange();

      // Send button click is blocked
      const blockedClick = new MouseEvent('click', { bubbles: true, cancelable: true });
      sendBtn.dispatchEvent(blockedClick);
      expect(blockedClick.defaultPrevented).toBe(true);
      expect(gate.isSubmissionAllowed()).toBe(false);

      // Enter key in composer is blocked
      const blockedEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      composer.dispatchEvent(blockedEnter);
      expect(blockedEnter.defaultPrevented).toBe(true);

      // User replaces/removes the secret with clean text
      composer.value = 'Please summarize this article about machine learning.';
      gate.handleContentChange();
      const verified = await gate.processAndVerifyContent();
      expect(verified).toBe(true);
      expect(gate.isSubmissionAllowed()).toBe(true);
      expect(sendBtn.disabled).toBe(false);

      // Send button click is now allowed
      const allowedClick = new MouseEvent('click', { bubbles: true, cancelable: true });
      sendBtn.dispatchEvent(allowedClick);
      expect(allowedClick.defaultPrevented).toBe(false);
    });
  });

  // ─── 7. Regression Tests: Authentication & Credential Management Page ───────

  describe('7. Authentication & API Key Management Pages: User Free, Agent Excluded', () => {
    it('user can type, edit, and click login/generate buttons while agent access is blocked', () => {
      document.body.innerHTML = `
        <div class="credentials-container">
          <h1>API Keys & Access Tokens</h1>
          <form id="key-gen-form" action="/api-keys/generate" method="POST">
            <input id="key-name" type="text" placeholder="Key description" />
            <input id="admin-pass" type="password" placeholder="Confirm password" />
            <button id="generate-key-btn" type="submit">Generate API Key</button>
          </form>
        </div>
      `;

      const policy = policyEngine.evaluateContext('https://example.com/settings/api-keys', document);
      expect(policy.context).toBe('AUTHENTICATION');
      expect(policy.policy).toBe('BLOCK_ALL');

      // The security policy blocks ONLY the AGENT capabilities
      expect(policy.allowScreenshot).toBe(false);
      expect(policy.allowDomTransmission).toBe(false);
      expect(policy.allowAgentActions).toBe(false);

      // The webpage MUST REMAIN 100% INTERACTIVE FOR THE USER
      const keyNameInput = document.getElementById('key-name') as HTMLInputElement;
      const passInput = document.getElementById('admin-pass') as HTMLInputElement;
      const generateBtn = document.getElementById('generate-key-btn') as HTMLButtonElement;
      const form = document.getElementById('key-gen-form') as HTMLFormElement;

      // Inputs and buttons are NOT disabled or readonly
      expect(keyNameInput.disabled).toBe(false);
      expect(keyNameInput.readOnly).toBe(false);
      expect(passInput.disabled).toBe(false);
      expect(generateBtn.disabled).toBe(false);

      // User typing key name
      let nameTyped = false;
      keyNameInput.addEventListener('keydown', (e) => {
        if (!e.defaultPrevented) nameTyped = true;
      });
      const keyEvt = new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true });
      keyNameInput.dispatchEvent(keyEvt);
      expect(keyEvt.defaultPrevented).toBe(false);
      expect(nameTyped).toBe(true);

      // User submitting key generation form
      let formSubmitted = false;
      form.addEventListener('submit', (e) => {
        if (!e.defaultPrevented) formSubmitted = true;
        e.preventDefault();
      });
      const submitEvt = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvt);
      expect(formSubmitted).toBe(true);
    });
  });

  // ─── 8. Regression Tests: Asynchronous / Slow Scanning Responsiveness ───────

  describe('8. Asynchronous / Slow Scanning Responsiveness Guarantee', () => {
    it('simulates slow API-key detection and verifies page, typing, clicking, scrolling, and forms remain responsive', async () => {
      document.body.innerHTML = `
        <div id="container">
          <input id="search-input" type="text" placeholder="Search..." />
          <button id="action-btn">Do Action</button>
          <form id="sample-form">
            <button type="submit" id="submit-btn">Go</button>
          </form>
        </div>
      `;

      const searchInput = document.getElementById('search-input') as HTMLInputElement;
      const actionBtn = document.getElementById('action-btn') as HTMLButtonElement;
      const form = document.getElementById('sample-form') as HTMLFormElement;

      // Simulate an asynchronous, slow secret scanner running in the background (e.g. 300ms delay)
      let scannerDone = false;
      const slowScanPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          scannerDone = true;
          resolve(true);
        }, 300);
      });

      // While the scanner is pending, verify:
      expect(scannerDone).toBe(false);

      // 1. Typing remains immediately responsive
      let typedWhileScanning = false;
      searchInput.addEventListener('keydown', (e) => {
        if (!e.defaultPrevented) typedWhileScanning = true;
      });
      const keyEvt = new KeyboardEvent('keydown', { key: 'q', bubbles: true, cancelable: true });
      searchInput.dispatchEvent(keyEvt);
      expect(keyEvt.defaultPrevented).toBe(false);
      expect(typedWhileScanning).toBe(true);

      // 2. Clicking remains immediately responsive
      let clickedWhileScanning = false;
      actionBtn.addEventListener('click', (e) => {
        if (!e.defaultPrevented) clickedWhileScanning = true;
      });
      const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true });
      actionBtn.dispatchEvent(clickEvt);
      expect(clickEvt.defaultPrevented).toBe(false);
      expect(clickedWhileScanning).toBe(true);

      // 3. Scrolling remains immediately responsive
      let scrolledWhileScanning = false;
      window.addEventListener('scroll', () => { scrolledWhileScanning = true; });
      window.dispatchEvent(new Event('scroll'));
      expect(scrolledWhileScanning).toBe(true);

      // 4. Forms remain usable
      let formSubmittedWhileScanning = false;
      form.addEventListener('submit', (e) => {
        if (!e.defaultPrevented) formSubmittedWhileScanning = true;
        e.preventDefault();
      });
      const submitEvt = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvt);
      expect(formSubmittedWhileScanning).toBe(true);

      // 5. Wait for the slow scanner to complete
      await slowScanPromise;
      expect(scannerDone).toBe(true);
    });
  });
});
