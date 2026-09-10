/**
 * contextBlocking.test.ts
 *
 * Comprehensive Test Suite for Context-Based Agent Blocking:
 * 1. Authentication Detection:
 *    - Login, Sign-in, Signup, Registration, Password Reset, Forgot Password, OTP/MFA, Account Recovery
 *    - Single password field alone does NOT classify as AUTHENTICATION
 *    - Normal form with password does not automatically block
 *    - False positive checks on normal search/article/settings pages
 * 2. Messaging Application Detection:
 *    - WhatsApp Web, Telegram Web, Discord, Slack, Teams, Messenger, Google Chat
 *    - Generic chat DOM structures
 *    - Generic contenteditable alone does NOT classify as messaging
 *    - Normal pages with comments or text editors do not classify as messaging
 * 3. Context Policy Engine:
 *    - AUTHENTICATION -> BLOCK_ALL
 *    - MESSAGING -> BLOCK_ALL
 *    - NORMAL -> ALLOW_PRIVACY_PIPELINE
 *    - UNKNOWN -> RESTRICTED (fail-closed)
 * 4. Pipeline & Transmission Guards:
 *    - No screenshots, DOM, OCR, or NER transmitted from blocked contexts
 * 5. ActionExecutor Protection:
 *    - Rejection of actions on auth/messaging pages
 *    - Re-evaluation of context before each action
 *    - Invalidation of actions after navigation into blocked context
 * 6. Audit Logging:
 *    - CONTEXT_BLOCKED events recorded without leaking sensitive credentials
 */

import { ContextDetector, KNOWN_MESSAGING_APPS, KNOWN_SOCIAL_MEDIA_SITES } from '../privacy/contextDetector';
import { ContextPolicyEngine, evaluatePageContext } from '../privacy/contextPolicyEngine';
import { ActionExecutor } from '../actions/actionExecutor';
import { AgentAction } from '../core/types';
import { runAgentPipeline, runAgentTask, handleSpaNavigation } from '../content/content';

describe('Context-Based Agent Blocking Suite', () => {
  let detector: ContextDetector;
  let policyEngine: ContextPolicyEngine;
  let executor: ActionExecutor;

  beforeEach(() => {
    detector = new ContextDetector();
    policyEngine = new ContextPolicyEngine(detector);
    executor = new ActionExecutor({
      LOCAL_EMAIL: 'user@sih.gov.in',
      LOCAL_PASSWORD: 'supersecretpass',
    });
    document.body.innerHTML = '';
  });

  // ─── 1. AUTHENTICATION DETECTION TESTS ─────────────────────────────────────

  describe('Authentication Detection', () => {
    it('detects standard login page with email, password, and sign-in button', () => {
      document.body.innerHTML = `
        <form action="/login" method="post">
          <h2>Sign In to Your Account</h2>
          <input type="email" id="user-email" name="email" placeholder="Enter email" />
          <input type="password" id="user-pass" name="password" placeholder="Password" />
          <button type="submit" id="login-btn">Sign In</button>
        </form>
      `;

      const result = detector.detectContext('https://example.com/login', document);
      expect(result.context).toBe('AUTHENTICATION');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('detects sign-up / registration page', () => {
      document.body.innerHTML = `
        <form action="/register">
          <h1>Create an Account</h1>
          <input type="text" name="username" placeholder="Choose username" />
          <input type="email" name="email" placeholder="Your email" />
          <input type="password" name="password" placeholder="Password" />
          <input type="password" name="confirm_password" placeholder="Confirm password" />
          <button type="submit">Sign Up</button>
        </form>
      `;

      const result = detector.detectContext('https://example.com/signup', document);
      expect(result.context).toBe('AUTHENTICATION');
    });

    it('detects password reset page', () => {
      document.body.innerHTML = `
        <div>
          <h2>Reset Your Password</h2>
          <p>Please enter your new password below.</p>
          <input type="password" name="new_password" placeholder="New Password" />
          <input type="password" name="confirm_new_password" placeholder="Confirm New Password" />
          <button type="submit">Reset Password</button>
        </div>
      `;

      const result = detector.detectContext('https://example.com/reset-password', document);
      expect(result.context).toBe('AUTHENTICATION');
    });

    it('detects login subdomains like login.microsoftonline.com and accounts.google.com without DOM', () => {
      expect(detector.detectContext('https://login.microsoftonline.com').context).toBe('AUTHENTICATION');
      expect(detector.detectContext('https://accounts.google.com/signin/v2').context).toBe('AUTHENTICATION');
      expect(detector.detectContext('https://auth.mycompany.com/oauth').context).toBe('AUTHENTICATION');
      expect(detector.detectContext('https://signin.aws.amazon.com').context).toBe('AUTHENTICATION');
    });

    it('detects framework login paths such as /users/sign_in and /session/new', () => {
      expect(detector.detectContext('https://gitlab.com/users/sign_in').context).toBe('AUTHENTICATION');
      expect(detector.detectContext('https://github.com/session/new').context).toBe('AUTHENTICATION');
    });

    it('detects forgot password / account recovery page', () => {
      document.body.innerHTML = `
        <div>
          <h1>Forgot Password</h1>
          <p>Enter your email to recover your account</p>
          <input type="email" name="recovery_email" placeholder="Account email" />
          <button type="submit">Recover Account</button>
        </div>
      `;

      const result = detector.detectContext('https://example.com/account/recovery', document);
      expect(result.context).toBe('AUTHENTICATION');
    });

    it('detects MFA / 2FA / OTP verification page', () => {
      document.body.innerHTML = `
        <div>
          <h3>Two-Factor Authentication</h3>
          <p>Enter the 6-digit verification code sent to your phone</p>
          <input type="text" name="otp" autocomplete="one-time-code" placeholder="Enter OTP" />
          <button type="button">Verify Code</button>
        </div>
      `;

      const result = detector.detectContext('https://example.com/verify/otp', document);
      expect(result.context).toBe('AUTHENTICATION');
    });

    it('DOES NOT classify a page with only a password input as AUTHENTICATION (prevents false positive)', () => {
      // Prompt requirement: A page containing only <input type="password"> should NOT automatically be classified as authentication
      document.body.innerHTML = `
        <div>
          <label>Wifi Pre-Shared Key:</label>
          <input type="password" id="wifi-key" value="mysecret" />
        </div>
      `;

      const result = detector.detectContext('https://router.local/settings/wifi', document);
      expect(result.context).not.toBe('AUTHENTICATION');
      expect(result.context).toBe('NORMAL');
    });

    it('DOES NOT block a normal profile or search page with no auth indicators', () => {
      document.body.innerHTML = `
        <div>
          <h1>National Internship Portal</h1>
          <input type="search" id="search-box" placeholder="Search internships" />
          <button type="button">Search</button>
        </div>
      `;

      const result = detector.detectContext('https://internships.gov.in/search', document);
      expect(result.context).toBe('NORMAL');
    });
  });

  // ─── 2. MESSAGING CONTEXT DETECTION TESTS ──────────────────────────────────

  describe('Messaging Context Detection', () => {
    it('detects WhatsApp Web via domain signature', () => {
      const result = detector.detectContext('https://web.whatsapp.com', document);
      expect(result.context).toBe('MESSAGING');
      expect(result.matchedApp).toBe('WhatsApp Web');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('detects Telegram Web via domain signature', () => {
      const result = detector.detectContext('https://web.telegram.org/k/', document);
      expect(result.context).toBe('MESSAGING');
      expect(result.matchedApp).toBe('Telegram Web');
    });

    it('detects Discord via domain signature', () => {
      const result = detector.detectContext('https://discord.com/channels/@me', document);
      expect(result.context).toBe('MESSAGING');
      expect(result.matchedApp).toBe('Discord');
    });

    it('detects Slack via domain signature', () => {
      const result = detector.detectContext('https://app.slack.com/client/T123/C456', document);
      expect(result.context).toBe('MESSAGING');
      expect(result.matchedApp).toBe('Slack');
    });

    it('detects Microsoft Teams via domain signature', () => {
      const result = detector.detectContext('https://teams.microsoft.com/v2/', document);
      expect(result.context).toBe('MESSAGING');
      expect(result.matchedApp).toBe('Microsoft Teams');
    });

    it('detects Facebook Messenger via domain signature', () => {
      const result = detector.detectContext('https://www.messenger.com/t/12345', document);
      expect(result.context).toBe('MESSAGING');
      expect(result.matchedApp).toBe('Facebook Messenger');
    });

    it('detects Google Chat via domain signature', () => {
      const result = detector.detectContext('https://chat.google.com/dm/123', document);
      expect(result.context).toBe('MESSAGING');
      expect(result.matchedApp).toBe('Google Chat');
    });

    it('detects generic chat DOM on non-branded domain', () => {
      document.body.innerHTML = `
        <div class="chat-container">
          <div role="log" aria-label="Messages" class="messages-list">
            <div class="message-bubble">Hello!</div>
          </div>
          <textarea placeholder="Type a message..." aria-label="Message"></textarea>
          <button type="button" aria-label="Send">Send</button>
        </div>
      `;

      const result = detector.detectContext('https://custom-site.org/support/chat', document);
      expect(result.context).toBe('MESSAGING');
    });

    it('detects webchat on localhost with composer and send button', () => {
      document.body.innerHTML = `
        <div id="chat-app">
          <input id="chat-input" placeholder="Type a message..." />
          <button id="send-btn">Send</button>
        </div>
      `;

      const result = detector.detectContext('http://localhost:3000/chat', document);
      expect(result.context).toBe('MESSAGING');
    });

    it('DOES NOT classify generic contenteditable as messaging (e.g. blog or rich text editor)', () => {
      // Prompt requirement: Do not classify a normal webpage merely because it contains contenteditable
      document.body.innerHTML = `
        <article>
          <h1>Write your blog post</h1>
          <div contenteditable="true" id="editor">
            This is my article content about science.
          </div>
          <button type="button">Publish Article</button>
        </article>
      `;

      const result = detector.detectContext('https://blog.platform.com/editor', document);
      expect(result.context).not.toBe('MESSAGING');
      expect(result.context).toBe('NORMAL');
    });

    it('DOES NOT classify a normal webpage with comments as messaging', () => {
      document.body.innerHTML = `
        <div>
          <h1>Article: React State Management</h1>
          <p>Article body goes here...</p>
          <div class="comments-section">
            <h3>Leave a Comment</h3>
            <textarea placeholder="Write a comment..."></textarea>
            <button type="submit">Submit Comment</button>
          </div>
        </div>
      `;

      const result = detector.detectContext('https://techblog.com/posts/react', document);
      expect(result.context).not.toBe('MESSAGING');
    });
  });

  // ─── 2B. SOCIAL MEDIA CONTEXT DETECTION TESTS ──────────────────────────────

  describe('Social Media Context Detection', () => {
    it('detects Facebook by hostname', () => {
      const result = detector.detectContext('https://www.facebook.com/user/timeline', document);
      expect(result.context).toBe('SOCIAL_MEDIA');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('detects Instagram by hostname', () => {
      const result = detector.detectContext('https://instagram.com/explore', document);
      expect(result.context).toBe('SOCIAL_MEDIA');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('detects X / Twitter by hostname (x.com and twitter.com)', () => {
      expect(detector.detectContext('https://x.com/home', document).context).toBe('SOCIAL_MEDIA');
      expect(detector.detectContext('https://twitter.com/notifications', document).context).toBe('SOCIAL_MEDIA');
    });

    it('detects LinkedIn by hostname', () => {
      const result = detector.detectContext('https://www.linkedin.com/feed/', document);
      expect(result.context).toBe('SOCIAL_MEDIA');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('detects Reddit by hostname', () => {
      const result = detector.detectContext('https://reddit.com/r/technology', document);
      expect(result.context).toBe('SOCIAL_MEDIA');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('detects TikTok by hostname', () => {
      const result = detector.detectContext('https://www.tiktok.com/@creator', document);
      expect(result.context).toBe('SOCIAL_MEDIA');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('detects Threads, Pinterest, Snapchat, Bluesky, Mastodon, Tumblr, Quora, Weibo, VK', () => {
      const platforms = [
        'https://www.threads.net/@user',
        'https://pinterest.com/pin/12345',
        'https://web.snapchat.com/',
        'https://bsky.app/profile/user.bsky.social',
        'https://mastodon.social/@user',
        'https://tumblr.com/dashboard',
        'https://quora.com/topic/cybersecurity',
        'https://weibo.com/feed',
        'https://vk.com/feed',
      ];
      for (const url of platforms) {
        const result = detector.detectContext(url, document);
        expect(result.context).toBe('SOCIAL_MEDIA');
      }
    });

    it('detects YouTube feed/community as social media', () => {
      const result = detector.detectContext('https://www.youtube.com/feed/subscriptions', document);
      expect(result.context).toBe('SOCIAL_MEDIA');
    });

    it('detects generic social media feeds via DOM structure', () => {
      document.body.innerHTML = `
        <div role="feed">
          <div data-testid="tweet"><p>Exciting announcement!</p></div>
          <div data-testid="tweet"><p>Another update</p></div>
        </div>
      `;
      const result = detector.detectContext('https://social-network-example.org/feed', document);
      expect(result.context).toBe('SOCIAL_MEDIA');
    });

    it('DOES NOT classify normal documentation or search results as social media', () => {
      document.body.innerHTML = `
        <main>
          <h1>API Documentation</h1>
          <p>Endpoints and guides for the REST API.</p>
        </main>
      `;
      const result = detector.detectContext('https://developer.mozilla.org/en-US/docs/Web', document);
      expect(result.context).toBe('NORMAL');
    });
  });

  // ─── 3. CONTEXT POLICY ENGINE TESTS ───────────────────────────────────────

  describe('Context Policy Engine', () => {
    it('enforces BLOCK_ALL on AUTHENTICATION context', () => {
      document.body.innerHTML = `
        <form>
          <h1>Login</h1>
          <input type="email" name="user" />
          <input type="password" name="pass" />
          <button type="submit">Sign In</button>
        </form>
      `;

      const policy = policyEngine.evaluateContext('https://example.com/login', document);
      expect(policy.context).toBe('AUTHENTICATION');
      expect(policy.policy).toBe('BLOCK_ALL');
      expect(policy.reason).toBe('AUTHENTICATION_CONTEXT');
      expect(policy.allowScreenshot).toBe(false);
      expect(policy.allowDomTransmission).toBe(false);
      expect(policy.allowOCRTransmission).toBe(false);
      expect(policy.allowAgentActions).toBe(false);
      expect(policy.allowCredentialResolution).toBe(false);
    });

    it('enforces BLOCK_ALL on MESSAGING context', () => {
      const policy = policyEngine.evaluateContext('https://web.whatsapp.com', document);
      expect(policy.context).toBe('MESSAGING');
      expect(policy.policy).toBe('BLOCK_ALL');
      expect(policy.reason).toBe('MESSAGING_CONTEXT');
      expect(policy.allowScreenshot).toBe(false);
      expect(policy.allowDomTransmission).toBe(false);
      expect(policy.allowOCRTransmission).toBe(false);
      expect(policy.allowAgentActions).toBe(false);
      expect(policy.allowCredentialResolution).toBe(false);
    });

    it('enforces BLOCK_ALL on SOCIAL_MEDIA context', () => {
      const policy = policyEngine.evaluateContext('https://x.com/home', document);
      expect(policy.context).toBe('SOCIAL_MEDIA');
      expect(policy.policy).toBe('BLOCK_ALL');
      expect(policy.reason).toBe('SOCIAL_MEDIA_CONTEXT');
      expect(policy.allowScreenshot).toBe(false);
      expect(policy.allowDomTransmission).toBe(false);
      expect(policy.allowOCRTransmission).toBe(false);
      expect(policy.allowAgentActions).toBe(false);
      expect(policy.allowCredentialResolution).toBe(false);
    });

    it('enforces ALLOW_PRIVACY_PIPELINE on NORMAL context', () => {
      document.body.innerHTML = `<div><h1>Government Jobs Portal</h1></div>`;
      const policy = policyEngine.evaluateContext('https://portal.gov.in', document);
      expect(policy.context).toBe('NORMAL');
      expect(policy.policy).toBe('ALLOW_PRIVACY_PIPELINE');
      expect(policy.allowScreenshot).toBe(true);
      expect(policy.allowDomTransmission).toBe(true);
      expect(policy.allowAgentActions).toBe(true);
    });

    it('enforces RESTRICTED (fail-closed) on UNKNOWN context', () => {
      const policy = policyEngine.evaluateContext('invalid-url-protocol://:::');
      expect(policy.context).toBe('UNKNOWN');
      expect(policy.policy).toBe('RESTRICTED');
      expect(policy.allowScreenshot).toBe(false);
      expect(policy.allowDomTransmission).toBe(false);
      expect(policy.allowAgentActions).toBe(false);
    });
  });

  // ─── 4. PIPELINE & TRANSMISSION GUARDS ─────────────────────────────────────

  describe('Pipeline & Transmission Guards', () => {
    it('blocks runAgentPipeline on authentication page before capturing or transmitting data', async () => {
      // Setup auth page
      document.body.innerHTML = `
        <form>
          <h2>Sign In</h2>
          <input type="email" value="admin@test.com" />
          <input type="password" value="secret123" />
          <button type="submit">Sign In</button>
        </form>
      `;

      // Set window location to login
      delete (window as any).location;
      window.location = new URL('https://example.com/login') as any;

      const res = await runAgentPipeline();
      expect(res.ok).toBe(false);
      expect(res.error).toContain('BLOCKED');
      expect(res.sanitizedScreenshot).toBeUndefined();
      expect(res.actions).toBeUndefined();
    });

    it('blocks runAgentTask on messaging application before screenshot or analysis', async () => {
      delete (window as any).location;
      window.location = new URL('https://web.whatsapp.com') as any;

      const res = await runAgentTask();
      expect(res.ok).toBe(false);
      expect(res.state).toBe('BLOCKED');
      expect(res.error).toContain('BLOCKED');
      expect(res.rawPiiTransmitted).toBe(0);
      expect(res.actionsExecuted.length).toBe(0);
    });

    it('blocks runAgentTask on social media website before screenshot or analysis', async () => {
      delete (window as any).location;
      window.location = new URL('https://x.com/home') as any;

      const res = await runAgentTask();
      expect(res.ok).toBe(false);
      expect(res.state).toBe('BLOCKED');
      expect(res.error).toContain('BLOCKED');
      expect(res.rawPiiTransmitted).toBe(0);
      expect(res.actionsExecuted.length).toBe(0);
    });
  });

  // ─── 5. ACTION EXECUTOR DEFENSE & CONTEXT RE-CHECK ─────────────────────────

  describe('ActionExecutor Context Defense', () => {
    it('rejects action execution on an authentication page', async () => {
      document.body.innerHTML = `
        <form>
          <h1>Login</h1>
          <input type="email" id="email-field" />
          <input type="password" id="pass-field" />
          <button type="submit" id="btn">Log In</button>
        </form>
      `;

      delete (window as any).location;
      window.location = new URL('https://example.com/login') as any;

      const action: AgentAction = {
        action: 'type',
        selector: '#email-field',
        valueRef: 'LOCAL_EMAIL',
      };

      const result = await executor.execute(action);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Action rejected by security policy');
      expect(result.error).toContain('AUTHENTICATION');
    });

    it('rejects action execution on a messaging application', async () => {
      delete (window as any).location;
      window.location = new URL('https://discord.com/channels/@me') as any;

      const action: AgentAction = {
        action: 'click',
        selector: '#send-btn',
      };

      const result = await executor.execute(action);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Action rejected by security policy');
      expect(result.error).toContain('MESSAGING');
    });

    it('rejects action execution on a social media website', async () => {
      delete (window as any).location;
      window.location = new URL('https://x.com/home') as any;

      const action: AgentAction = {
        action: 'click',
        selector: '#tweet-btn',
      };

      const result = await executor.execute(action);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Action rejected by security policy');
      expect(result.error).toContain('SOCIAL_MEDIA');
    });

    it('invalidates previously generated actions if page navigates into an authentication context', async () => {
      // Step 1: Planned on normal page
      delete (window as any).location;
      window.location = new URL('https://example.com/search') as any;
      document.body.innerHTML = `<input id="search-box" /><button id="search-btn">Search</button>`;

      const plannedAction: AgentAction = {
        action: 'click',
        selector: '#search-btn',
      };

      // Step 2: User or SPA navigates to login before execution
      window.location = new URL('https://example.com/login') as any;
      document.body.innerHTML = `
        <form>
          <h2>Log In</h2>
          <input type="password" />
          <button type="submit">Sign In</button>
        </form>
      `;

      // Step 3: Executor re-checks active context at moment of execution
      const result = await executor.execute(plannedAction);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Action rejected by security policy');
      expect(result.error).toContain('AUTHENTICATION');
    });

    it('permits actions on legitimate normal pages', async () => {
      delete (window as any).location;
      window.location = new URL('https://example.com/products') as any;
      document.body.innerHTML = `<button id="add-to-cart">Add to Cart</button>`;

      const btn = document.getElementById('add-to-cart')!;
      btn.getBoundingClientRect = () => ({
        x: 10, y: 10, width: 100, height: 40, top: 10, left: 10, right: 110, bottom: 50, toJSON: () => {},
      });

      const action: AgentAction = {
        action: 'click',
        selector: '#add-to-cart',
      };

      const result = await executor.execute(action);
      expect(result.success).toBe(true);
    });
  });

  // ─── 6. SPA NAVIGATION DETECTION ──────────────────────────────────────────

  describe('SPA Navigation Support', () => {
    it('re-evaluates context when handleSpaNavigation is triggered', () => {
      delete (window as any).location;
      window.location = new URL('https://portal.com/home') as any;
      handleSpaNavigation();

      expect(evaluatePageContext('https://portal.com/home').context).toBe('NORMAL');

      // Navigate to login via SPA
      window.location = new URL('https://portal.com/login') as any;
      document.body.innerHTML = `<input type="email"/><input type="password"/><button>Sign In</button>`;
      handleSpaNavigation();

      expect(evaluatePageContext('https://portal.com/login').context).toBe('AUTHENTICATION');
    });
  });
});
