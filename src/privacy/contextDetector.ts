/**
 * contextDetector.ts
 *
 * Centralized Multi-Signal Context Detector for Privacy Firewall / VeilAgent.
 *
 * Detects whether the current active browsing context is:
 *  - AUTHENTICATION (login, signup, password reset, MFA/OTP, account recovery)
 *  - MESSAGING (WhatsApp Web, Telegram, Discord, Slack, Teams, Messenger, Google Chat, generic chat)
 *  - NORMAL (safe for privacy-preserving local agent analysis)
 *  - UNKNOWN (fail-closed, restricted operations)
 *
 * Implements strict multi-signal confidence scoring to eliminate false positives
 * (e.g., single password field on settings page != auth page; contenteditable != messaging app).
 */

import { PageContextType } from '../core/types';

// ─── Messaging Application Signatures ─────────────────────────────────────────

export interface MessagingAppSignature {
  name: string;
  domains: string[];
  context: 'MESSAGING';
  urlPatterns?: RegExp[];
}

export const KNOWN_MESSAGING_APPS: MessagingAppSignature[] = [
  {
    name: 'WhatsApp Web',
    domains: ['web.whatsapp.com'],
    context: 'MESSAGING',
  },
  {
    name: 'Telegram Web',
    domains: ['web.telegram.org'],
    context: 'MESSAGING',
  },
  {
    name: 'Discord',
    domains: ['discord.com', 'discordapp.com'],
    context: 'MESSAGING',
  },
  {
    name: 'Facebook Messenger',
    domains: ['messenger.com', 'www.messenger.com'],
    context: 'MESSAGING',
  },
  {
    name: 'Facebook Messenger',
    domains: ['facebook.com', 'web.facebook.com'],
    urlPatterns: [/\/messages/i],
    context: 'MESSAGING',
  },
  {
    name: 'Instagram Direct',
    domains: ['instagram.com', 'www.instagram.com'],
    urlPatterns: [/\/direct(\/|$)/i],
    context: 'MESSAGING',
  },
  {
    name: 'Slack',
    domains: ['slack.com', 'app.slack.com'],
    context: 'MESSAGING',
  },
  {
    name: 'Microsoft Teams',
    domains: ['teams.microsoft.com', 'teams.live.com'],
    context: 'MESSAGING',
  },
  {
    name: 'Google Chat',
    domains: ['chat.google.com'],
    context: 'MESSAGING',
  },
];

// ─── AI Website Application Signatures ────────────────────────────────────────

export interface AiSiteSignature {
  name: string;
  domains: string[];
  context: 'AI_ASSISTANT';
  urlPatterns?: RegExp[];
  composerSelectors?: string[];
  sendButtonSelectors?: string[];
}

export const KNOWN_AI_SITES: AiSiteSignature[] = [
  {
    name: 'ChatGPT',
    domains: ['chatgpt.com', 'chat.openai.com'],
    context: 'AI_ASSISTANT',
    composerSelectors: ['#prompt-textarea', 'div[contenteditable="true"]', 'textarea[data-id]'],
    sendButtonSelectors: ['button[data-testid="send-button"]', 'button[aria-label*="send" i]'],
  },
  {
    name: 'Claude',
    domains: ['claude.ai'],
    context: 'AI_ASSISTANT',
    composerSelectors: ['div[contenteditable="true"]', 'fieldset div[contenteditable]', 'textarea'],
    sendButtonSelectors: ['button[aria-label*="send" i]'],
  },
  {
    name: 'Gemini',
    domains: ['gemini.google.com'],
    context: 'AI_ASSISTANT',
    composerSelectors: ['div.rich-textarea', 'div[contenteditable="true"]', 'textarea'],
    sendButtonSelectors: ['button[aria-label*="send" i]', 'button.send-button'],
  },
  {
    name: 'Microsoft Copilot',
    domains: ['copilot.microsoft.com'],
    context: 'AI_ASSISTANT',
    composerSelectors: ['textarea', 'div[contenteditable="true"]'],
    sendButtonSelectors: ['button[aria-label*="submit" i]', 'button[aria-label*="send" i]'],
  },
  {
    name: 'Perplexity',
    domains: ['perplexity.ai', 'www.perplexity.ai'],
    context: 'AI_ASSISTANT',
    composerSelectors: ['textarea[placeholder*="ask" i]', 'textarea'],
    sendButtonSelectors: ['button[aria-label*="submit" i]', 'button[aria-label*="send" i]'],
  },
];

// ─── Social Media Application Signatures ──────────────────────────────────────

export interface SocialMediaSignature {
  name: string;
  domains: string[];
  context: 'SOCIAL_MEDIA';
  urlPatterns?: RegExp[];
}

export const KNOWN_SOCIAL_MEDIA_SITES: SocialMediaSignature[] = [
  {
    name: 'Facebook',
    domains: ['facebook.com', 'fb.com', 'm.facebook.com', 'web.facebook.com'],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'Instagram',
    domains: ['instagram.com', 'www.instagram.com', 'm.instagram.com'],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'X / Twitter',
    domains: ['x.com', 'twitter.com', 'mobile.twitter.com'],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'LinkedIn',
    domains: ['linkedin.com', 'www.linkedin.com', 'm.linkedin.com'],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'Reddit',
    domains: ['reddit.com', 'old.reddit.com', 'www.reddit.com', 'm.reddit.com'],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'TikTok',
    domains: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'Threads',
    domains: ['threads.net', 'www.threads.net'],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'Pinterest',
    domains: ['pinterest.com', 'www.pinterest.com'],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'Snapchat',
    domains: ['snapchat.com', 'www.snapchat.com', 'web.snapchat.com'],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'Bluesky',
    domains: ['bsky.app', 'main.bsky.app'],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'Mastodon',
    domains: ['mastodon.social'],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'Tumblr',
    domains: ['tumblr.com', 'www.tumblr.com'],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'Quora',
    domains: ['quora.com', 'www.quora.com'],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'YouTube',
    domains: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
    urlPatterns: [/\/community/i, /\/post\//i, /\/feed/i],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'Weibo',
    domains: ['weibo.com', 'www.weibo.com'],
    context: 'SOCIAL_MEDIA',
  },
  {
    name: 'VK',
    domains: ['vk.com', 'm.vk.com'],
    context: 'SOCIAL_MEDIA',
  },
];

// ─── Detection Result ─────────────────────────────────────────────────────────

export interface ContextDetectionResult {
  context: PageContextType;
  confidence: number;
  signals: string[];
  matchedDomain?: string;
  matchedApp?: string;
  scoreBreakdown?: Record<string, number>;
}

// ─── Context Detector Class ───────────────────────────────────────────────────

export class ContextDetector {
  private messagingSignatures: MessagingAppSignature[];
  private socialMediaSignatures: SocialMediaSignature[];
  private aiSiteSignatures: AiSiteSignature[];

  constructor(
    messagingSignatures: MessagingAppSignature[] = KNOWN_MESSAGING_APPS,
    socialMediaSignatures: SocialMediaSignature[] = KNOWN_SOCIAL_MEDIA_SITES,
    aiSiteSignatures: AiSiteSignature[] = KNOWN_AI_SITES
  ) {
    this.messagingSignatures = [...messagingSignatures];
    this.socialMediaSignatures = [...socialMediaSignatures];
    this.aiSiteSignatures = [...aiSiteSignatures];
  }

  /**
   * Register an additional messaging application signature dynamically.
   */
  registerMessagingApp(signature: MessagingAppSignature): void {
    this.messagingSignatures.push(signature);
  }

  /**
   * Register an additional social media website application signature dynamically.
   */
  registerSocialMediaSite(signature: SocialMediaSignature): void {
    this.socialMediaSignatures.push(signature);
  }

  getSocialMediaSignatures(): SocialMediaSignature[] {
    return [...this.socialMediaSignatures];
  }

  /**
   * Register an additional AI website application signature dynamically.
   */
  registerAiSite(signature: AiSiteSignature): void {
    this.aiSiteSignatures.push(signature);
  }

  getAiSignatures(): AiSiteSignature[] {
    return [...this.aiSiteSignatures];
  }

  /**
   * Evaluates context from URL and optional DOM document.
   */
  detectContext(url?: string, doc?: Document): ContextDetectionResult {
    // 1. Check if environment or URL is completely missing/invalid
    if (!url && !doc && typeof window === 'undefined') {
      return {
        context: 'UNKNOWN',
        confidence: 0,
        signals: ['NO_URL_OR_DOC_AVAILABLE'],
      };
    }

    const targetDoc = doc !== undefined ? doc : (url && typeof window !== 'undefined' && url !== window.location.href ? undefined : (typeof document !== 'undefined' ? document : undefined));
    const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

    // 2. Evaluate Authentication Context (BLOCK_ALL)
    const authResult = this.evaluateAuthentication(targetUrl, targetDoc);
    if (authResult.isMatch) {
      return {
        context: 'AUTHENTICATION',
        confidence: authResult.confidence,
        signals: authResult.signals,
        scoreBreakdown: authResult.scores,
      };
    }

    // 3. Evaluate Messaging Context (BLOCK_ALL)
    const messagingResult = this.evaluateMessaging(targetUrl, targetDoc);
    if (messagingResult.isMatch) {
      return {
        context: 'MESSAGING',
        confidence: messagingResult.confidence,
        signals: messagingResult.signals,
        matchedDomain: messagingResult.matchedDomain,
        matchedApp: messagingResult.matchedApp,
        scoreBreakdown: messagingResult.scores,
      };
    }

    // 4. Evaluate Social Media Context (BLOCK_ALL)
    const socialResult = this.evaluateSocialMedia(targetUrl, targetDoc);
    if (socialResult.isMatch) {
      return {
        context: 'SOCIAL_MEDIA',
        confidence: socialResult.confidence,
        signals: socialResult.signals,
        matchedDomain: socialResult.matchedDomain,
        matchedApp: socialResult.matchedApp,
        scoreBreakdown: socialResult.scores,
      };
    }

    // 5. Evaluate AI Assistant Context (PRIVACY_SEND_GATE)
    const aiResult = this.evaluateAiAssistant(targetUrl, targetDoc);
    if (aiResult.isMatch) {
      return {
        context: 'AI_ASSISTANT',
        confidence: aiResult.confidence,
        signals: aiResult.signals,
        matchedDomain: aiResult.matchedDomain,
        matchedApp: aiResult.matchedApp,
        scoreBreakdown: aiResult.scores,
      };
    }

    // 5. If URL is invalid or malformed, fail closed to UNKNOWN
    if (targetUrl) {
      try {
        new URL(targetUrl);
      } catch {
        return {
          context: 'UNKNOWN',
          confidence: 0.5,
          signals: ['MALFORMED_URL'],
        };
      }
    } else if (!targetDoc) {
      return {
        context: 'UNKNOWN',
        confidence: 0.5,
        signals: ['INDETERMINATE_PAGE_STATE'],
      };
    }

    // 5. Normal context
    return {
      context: 'NORMAL',
      confidence: 0.95,
      signals: ['NORMAL_WEB_PAGE'],
    };
  }

  // ─── Authentication Detection Multi-Signal Engine ───────────────────────────

  private evaluateAuthentication(
    url: string,
    doc?: Document
  ): { isMatch: boolean; confidence: number; signals: string[]; scores: Record<string, number> } {
    const signals: string[] = [];
    const scores: Record<string, number> = {};
    let totalScore = 0;

    let parsedUrl: URL | null = null;
    try {
      if (url) parsedUrl = new URL(url);
    } catch {
      // Ignored
    }

    const path = parsedUrl ? parsedUrl.pathname.toLowerCase() : url.toLowerCase();
    const hostname = parsedUrl ? parsedUrl.hostname.toLowerCase() : '';
    const fullUrl = url.toLowerCase();

    // A1. Subdomain / Hostname Signals (login.*, signin.*, auth.*, accounts.*)
    const authHostPatterns: Array<{ re: RegExp; label: string; score: number }> = [
      { re: /^(login|signin|sign-in|auth|accounts|account|sso|identity|idp)\./i, label: 'HOST_AUTH_PRIMARY', score: 45 },
      { re: /\.(okta|auth0)\.com$/i, label: 'HOST_AUTH_IDP', score: 45 },
    ];

    for (const pat of authHostPatterns) {
      if (pat.re.test(hostname)) {
        signals.push(pat.label);
        scores[pat.label] = pat.score;
        totalScore += pat.score;
        break;
      }
    }

    // A2. URL Path & Query Signals
    const authUrlPatterns: Array<{ re: RegExp; label: string; score: number }> = [
      { re: /\/(login|signin|sign-in|sign_in|log_in)(\/|$|\.|\?)/i, label: 'URL_AUTH_LOGIN', score: 45 },
      { re: /\/(session\/new|users\/sign_in|identity\/login)(\/|$|\.|\?)/i, label: 'URL_AUTH_LOGIN', score: 45 },
      { re: /\/(signup|sign-up|register|registration|sign_up)(\/|$|\.|\?)/i, label: 'URL_AUTH_SIGNUP', score: 45 },
      { re: /\/(forgot[-_/]?password|reset[-_/]?password|password[-_/]?reset)(\/|$|\.|\?)/i, label: 'URL_PASSWORD_RESET', score: 45 },
      { re: /\/(account[-_/]?recovery|recover[-_/]?account|recovery)(\/|$|\.|\?)/i, label: 'URL_ACCOUNT_RECOVERY', score: 45 },
      { re: /\/(verify|verification|mfa|2fa|otp|challenge)(\/|$|\.|\?)/i, label: 'URL_MFA_OTP', score: 45 },
      { re: /\/(api[-_/]?keys|access[-_/]?tokens|developer[-_/]?keys|personal[-_/]?access[-_/]?tokens|credentials|manage[-_/]?keys|secrets)(\/|$|\.|\?)/i, label: 'URL_CREDENTIAL_MANAGEMENT', score: 45 },
      { re: /\/(auth|oauth|authenticate)(\/|$|\.|\?)/i, label: 'URL_AUTH_GENERIC', score: 30 },
    ];

    for (const pat of authUrlPatterns) {
      if (pat.re.test(path) || pat.re.test(fullUrl)) {
        signals.push(pat.label);
        scores[pat.label] = pat.score;
        totalScore += pat.score;
        break; // Count highest matching URL signal
      }
    }

    // A3. Query parameter indicators (e.g. ?login=true, ?redirect_to=login, ?mode=signin)
    if (parsedUrl && /[?&](login|signin|sign_in|mode=login|action=login)/i.test(parsedUrl.search)) {
      if (!signals.some(s => s.startsWith('URL_AUTH'))) {
        signals.push('URL_AUTH_QUERY');
        scores['URL_AUTH_QUERY'] = 30;
        totalScore += 30;
      }
    }

    // B. DOM Signals
    if (doc) {
      // 1. Password input detection
      const passwordInputs = doc.querySelectorAll('input[type="password"]');
      const hasPassword = passwordInputs.length > 0;
      if (hasPassword) {
        signals.push('DOM_PASSWORD_INPUT');
        scores['DOM_PASSWORD_INPUT'] = 25;
        totalScore += 25;

        if (passwordInputs.length >= 2) {
          // Typically registration or password reset (new password + confirm password)
          signals.push('DOM_MULTI_PASSWORD_INPUT');
          scores['DOM_MULTI_PASSWORD_INPUT'] = 25;
          totalScore += 25;
        }
      }

      // 2. Email / Username / Identifier input detection
      const emailOrUserInputs = doc.querySelectorAll(
        'input[type="email"], input[autocomplete*="username" i], input[autocomplete*="email" i], input[name*="user" i], input[name*="email" i], input[id*="user" i], input[id*="email" i]'
      );
      if (emailOrUserInputs.length > 0) {
        signals.push('DOM_EMAIL_USER_INPUT');
        scores['DOM_EMAIL_USER_INPUT'] = 20;
        totalScore += 20;
      }

      // 3. OTP / Verification code input
      const otpInputs = doc.querySelectorAll(
        'input[name*="otp" i], input[autocomplete*="one-time-code" i], input[id*="otp" i], input[aria-label*="otp" i], input[placeholder*="otp" i], input[placeholder*="verification code" i], input[placeholder*="passcode" i]'
      );
      if (otpInputs.length > 0) {
        signals.push('DOM_OTP_INPUT');
        scores['DOM_OTP_INPUT'] = 45;
        totalScore += 45;
      }

      // 4. Action Buttons (Sign In, Log In, Sign Up, Register, Verify, Reset)
      const buttons = Array.from(
        doc.querySelectorAll('button, input[type="submit"], a[role="button"]')
      );
      for (const btn of buttons) {
        const text = (btn.textContent || (btn as HTMLInputElement).value || '').trim().toLowerCase();
        const idOrClass = ((btn.id || '') + ' ' + (btn.className || '')).toLowerCase();

        if (/\b(sign\s*in|log\s*in|login|signin)\b/i.test(text) || /login|signin/i.test(idOrClass)) {
          signals.push('DOM_LOGIN_BUTTON');
          scores['DOM_LOGIN_BUTTON'] = 30;
          totalScore += 30;
          break;
        }
        if (/\b(sign\s*up|register|create\s*(an\s*)?account|join\s*now)\b/i.test(text) || /signup|register/i.test(idOrClass)) {
          signals.push('DOM_SIGNUP_BUTTON');
          scores['DOM_SIGNUP_BUTTON'] = 30;
          totalScore += 30;
          break;
        }
        if (/\b(reset\s*password|recover\s*account|send\s*otp|verify\s*otp|verify\s*code)\b/i.test(text)) {
          signals.push('DOM_RESET_OR_VERIFY_BUTTON');
          scores['DOM_RESET_OR_VERIFY_BUTTON'] = 35;
          totalScore += 35;
          break;
        }
      }

      // 5. Auth Headings / Page Title
      const headings = Array.from(doc.querySelectorAll('h1, h2, h3, [role="heading"], title'));
      for (const h of headings) {
        const text = (h.textContent || '').trim().toLowerCase();
        if (
          /\b(sign\s*in|log\s*in|welcome\s*back|create\s*(your\s*)?account|sign\s*up|reset\s*(your\s*)?password|forgot\s*password|two[- ]factor\s*authentication|2fa\s*verification|enter\s*verification\s*code|verify\s*your\s*identity|api\s*keys?|personal\s*access\s*tokens?|manage\s*credentials|api\s*tokens?)\b/i.test(
            text
          )
        ) {
          signals.push(`DOM_AUTH_HEADING: ${text.slice(0, 30)}`);
          scores['DOM_AUTH_HEADING'] = 25;
          totalScore += 25;
          break;
        }
      }

      // 6. Form semantic attributes
      const authForms = doc.querySelectorAll(
        'form[action*="login" i], form[action*="signin" i], form[action*="auth" i], form[id*="login" i], form[id*="signin" i], form[id*="signup" i], form[class*="login" i]'
      );
      if (authForms.length > 0) {
        signals.push('DOM_AUTH_FORM_ATTRS');
        scores['DOM_AUTH_FORM_ATTRS'] = 20;
        totalScore += 20;
      }
    }

    // ─── Classification Decision ───
    const isStrongCombo =
      (signals.includes('DOM_PASSWORD_INPUT') &&
        signals.includes('DOM_EMAIL_USER_INPUT') &&
        (signals.includes('DOM_LOGIN_BUTTON') || signals.includes('DOM_SIGNUP_BUTTON'))) ||
      (signals.some((s) => s.startsWith('URL_')) && signals.includes('DOM_PASSWORD_INPUT')) ||
      (signals.includes('DOM_OTP_INPUT') &&
        (signals.some((s) => s.startsWith('URL_')) ||
          signals.some((s) => s.startsWith('DOM_AUTH_HEADING')) ||
          signals.includes('DOM_RESET_OR_VERIFY_BUTTON'))) ||
      (signals.includes('DOM_MULTI_PASSWORD_INPUT') &&
        (signals.includes('DOM_SIGNUP_BUTTON') ||
          signals.includes('DOM_RESET_OR_VERIFY_BUTTON') ||
          signals.some((s) => s.startsWith('DOM_AUTH_HEADING')))) ||
      signals.includes('URL_AUTH_LOGIN') ||
      signals.includes('URL_AUTH_SIGNUP') ||
      signals.includes('URL_PASSWORD_RESET') ||
      signals.includes('URL_ACCOUNT_RECOVERY') ||
      signals.includes('URL_MFA_OTP') ||
      signals.includes('HOST_AUTH_PRIMARY') ||
      signals.includes('HOST_AUTH_IDP');

    const hasAuthCredentialField =
      signals.includes('DOM_PASSWORD_INPUT') ||
      signals.includes('DOM_MULTI_PASSWORD_INPUT') ||
      signals.includes('DOM_OTP_INPUT');

    const hasAuthUrl = signals.some((s) => s.startsWith('URL_') || s.startsWith('HOST_AUTH'));
    const hasAuthHeadingOrAction =
      signals.some((s) => s.startsWith('DOM_AUTH_HEADING')) &&
      (signals.includes('DOM_RESET_OR_VERIFY_BUTTON') || signals.includes('DOM_LOGIN_BUTTON') || signals.includes('DOM_SIGNUP_BUTTON'));

    if (!hasAuthCredentialField && !hasAuthUrl && !hasAuthHeadingOrAction) {
      return {
        isMatch: false,
        confidence: 0,
        signals,
        scores,
      };
    }

    const isMatch = totalScore >= 55 || isStrongCombo;
    const confidence = isMatch ? Math.min(0.99, Math.max(0.7, totalScore / 100)) : 0;

    return {
      isMatch,
      confidence,
      signals,
      scores,
    };
  }

  // ─── Messaging Detection Multi-Signal Engine ────────────────────────────────

  private evaluateMessaging(
    url: string,
    doc?: Document
  ): {
    isMatch: boolean;
    confidence: number;
    signals: string[];
    matchedDomain?: string;
    matchedApp?: string;
    scores: Record<string, number>;
  } {
    const signals: string[] = [];
    const scores: Record<string, number> = {};
    let totalScore = 0;
    let matchedDomain: string | undefined;
    let matchedApp: string | undefined;

    let parsedUrl: URL | null = null;
    try {
      if (url) parsedUrl = new URL(url);
    } catch {
      // Ignored
    }

    const hostname = parsedUrl ? parsedUrl.hostname.toLowerCase() : '';
    const pathname = parsedUrl ? parsedUrl.pathname.toLowerCase() : url.toLowerCase();

    // A0. Supported AI websites are AI_ASSISTANT context, NOT messaging applications!
    for (const aiSite of this.aiSiteSignatures) {
      for (const domain of aiSite.domains) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          return {
            isMatch: false,
            confidence: 0,
            signals: [],
            scores: {},
          };
        }
      }
    }

    // A. Known Application & Domain Signatures
    for (const app of this.messagingSignatures) {
      for (const domain of app.domains) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          // Check optional urlPatterns if specified
          if (app.urlPatterns && app.urlPatterns.length > 0) {
            const matchesPattern = app.urlPatterns.some((re) => re.test(pathname));
            if (!matchesPattern) continue;
          }

          matchedApp = app.name;
          matchedDomain = domain;
          signals.push(`KNOWN_MESSAGING_APP: ${app.name} (${domain})`);
          scores['KNOWN_APP_DOMAIN'] = 90;
          totalScore += 90;
          break;
        }
      }
      if (matchedApp) break;
    }

    // B. URL Path Signals (supporting signals only)
    const chatUrlPattern = /\/(chat|messages|messaging|dm|direct|inbox|conversations)(\/|$|\?)/i;
    if (chatUrlPattern.test(pathname)) {
      signals.push('URL_MESSAGING_PATH');
      scores['URL_MESSAGING_PATH'] = 25;
      totalScore += 25;
    }

    // C. DOM / Application Signals
    let hasComposer = false;
    let hasThread = false;

    if (doc) {
      // 1. Message composer input
      const composerSelectors = [
        '[contenteditable="true"][aria-label*="message" i]',
        '[contenteditable="true"][data-placeholder*="message" i]',
        '[contenteditable="true"][role="textbox"]',
        'textarea[placeholder*="message" i]',
        'textarea[placeholder*="chat" i]',
        'textarea[aria-label*="message" i]',
        'textarea[id*="chat" i]',
        'textarea[name*="message" i]',
        'textarea[id*="message" i]',
        'input[placeholder*="message" i]',
        'input[placeholder*="chat" i]',
        'input[placeholder*="type a message" i]',
        'input[placeholder*="send a message" i]',
        'input[name*="message" i]',
        'input[id*="message" i]',
        'input[id*="chat" i]',
        '[data-testid*="chat-input" i]',
        'div[data-tab="10"]', // WhatsApp Web message input
        'div[data-slate-editor="true"]', // Slack / Discord editor
      ];

      for (const sel of composerSelectors) {
        if (doc.querySelector(sel)) {
          signals.push(`DOM_MESSAGE_COMPOSER: ${sel}`);
          scores['DOM_MESSAGE_COMPOSER'] = 35;
          totalScore += 35;
          hasComposer = true;
          break;
        }
      }

      // 2. Chat / Conversation log structures
      const threadSelectors = [
        '[role="log"]',
        '[aria-label*="messages" i]',
        '[aria-label*="chat" i]',
        '[data-testid*="conversation" i]',
        '[data-testid*="chat" i]',
        '[data-testid*="message-list" i]',
        '.messages-list',
        '.chat-messages',
        '.message-thread',
      ];

      hasThread = false;
      for (const sel of threadSelectors) {
        if (doc.querySelector(sel)) {
          signals.push(`DOM_CONVERSATION_THREAD: ${sel}`);
          scores['DOM_CONVERSATION_THREAD'] = 30;
          totalScore += 30;
          hasThread = true;
          break;
        }
      }

      // 3. Message send button
      const sendButtons = Array.from(
        doc.querySelectorAll('button, [role="button"], input[type="submit"]')
      );
      for (const btn of sendButtons) {
        const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
        const text = (btn.textContent || '').trim().toLowerCase();
        const testId = (btn.getAttribute('data-testid') || '').toLowerCase();
        const id = (btn.id || '').toLowerCase();
        const className = (btn.className || '').toLowerCase();

        if (
          aria === 'send' ||
          aria === 'send message' ||
          text === 'send' ||
          text === 'send message' ||
          id === 'send-btn' ||
          id.includes('send-button') ||
          className.includes('send-button') ||
          testId.includes('send-button')
        ) {
          // If we also have composer or thread, give send button full credit
          if (hasComposer || hasThread || matchedApp) {
            signals.push('DOM_SEND_BUTTON');
            scores['DOM_SEND_BUTTON'] = 20;
            totalScore += 20;
            break;
          }
        }
      }

      // 4. Standalone generic contenteditable test
      // If a page ONLY has a generic contenteditable without composer context or chat containers,
      // we do NOT treat it as messaging.
      const genericContentEditable = doc.querySelector('[contenteditable="true"]');
      if (genericContentEditable && !hasComposer && !hasThread && !matchedApp) {
        signals.push('GENERIC_CONTENTEDITABLE_NON_CHAT');
        scores['GENERIC_CONTENTEDITABLE_NON_CHAT'] = 5;
        totalScore += 5;
      }
    }

    // ─── Classification Decision ───
    // Known messaging app domain -> Immediately classified as MESSAGING (score >= 90)
    // Generic chat DOM -> Requires composer + thread + send button or URL signal (score >= 60 or combo)
    const isComboMatch =
      (signals.includes('URL_MESSAGING_PATH') && (hasComposer || hasThread)) ||
      (hasComposer && hasThread) ||
      (hasComposer && signals.includes('DOM_SEND_BUTTON'));
    const isMatch = totalScore >= 60 || isComboMatch;
    const confidence = isMatch ? Math.min(0.99, Math.max(0.75, totalScore / 100)) : 0;

    return {
      isMatch,
      confidence,
      signals,
      matchedDomain,
      matchedApp,
      scores,
    };
  }

  // ─── Social Media Detection Multi-Signal Engine ───────────────────────────

  private evaluateSocialMedia(
    url: string,
    doc?: Document
  ): {
    isMatch: boolean;
    confidence: number;
    signals: string[];
    matchedDomain?: string;
    matchedApp?: string;
    scores: Record<string, number>;
  } {
    const signals: string[] = [];
    const scores: Record<string, number> = {};
    let totalScore = 0;
    let matchedDomain: string | undefined;
    let matchedApp: string | undefined;

    let parsedUrl: URL | null = null;
    try {
      if (url) parsedUrl = new URL(url);
    } catch {
      // Ignored
    }

    const hostname = parsedUrl ? parsedUrl.hostname.toLowerCase() : '';
    const pathname = parsedUrl ? parsedUrl.pathname.toLowerCase() : url.toLowerCase();

    // A. Known Application & Domain Signatures
    for (const site of this.socialMediaSignatures) {
      for (const domain of site.domains) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          if (site.urlPatterns && site.urlPatterns.length > 0) {
            const matchesPattern = site.urlPatterns.some((re) => re.test(pathname));
            if (!matchesPattern) continue;
          }

          matchedApp = site.name;
          matchedDomain = domain;
          signals.push(`KNOWN_SOCIAL_MEDIA: ${site.name} (${domain})`);
          scores['KNOWN_SOCIAL_MEDIA_DOMAIN'] = 95;
          totalScore += 95;
          break;
        }
      }
      if (matchedApp) break;
    }

    // B. Generic Feed / Timeline DOM Signals
    if (doc) {
      let domScore = 0;
      if (doc.querySelector('div[role="feed"], [aria-label*="timeline" i], [aria-label*="feed" i]')) {
        signals.push('DOM_SOCIAL_FEED_CONTAINER');
        domScore += 35;
      }
      if (doc.querySelector('[data-testid*="tweet" i], [data-testid*="post" i], article[data-testid*="tweet" i]')) {
        signals.push('DOM_SOCIAL_POST_ITEM');
        domScore += 35;
      }
      if (doc.querySelector('[data-testid*="retweet" i], [data-testid*="like" i], button[aria-label*="repost" i], button[aria-label*="retweet" i]')) {
        signals.push('DOM_SOCIAL_INTERACTION_BTN');
        domScore += 20;
      }
      if (domScore > 0) {
        scores['DOM_SOCIAL_FEED'] = domScore;
        totalScore += domScore;
      }
    }

    // C. Generic URL Feed / Timeline Indicators
    if (pathname && /\/(feed|timeline|stream|posts|wall)(\/|$)/i.test(pathname)) {
      signals.push('URL_SOCIAL_FEED_PATH');
      scores['URL_SOCIAL_FEED_PATH'] = 20;
      totalScore += 20;
    }

    const isMatch = totalScore >= 60;
    const confidence = isMatch ? Math.min(0.99, Math.max(0.85, totalScore / 100)) : 0;

    return {
      isMatch,
      confidence,
      signals,
      matchedDomain,
      matchedApp,
      scores,
    };
  }

  // ─── AI Assistant Detection Multi-Signal Engine ──────────────────────────

  private evaluateAiAssistant(
    url: string,
    doc?: Document
  ): {
    isMatch: boolean;
    confidence: number;
    signals: string[];
    matchedDomain?: string;
    matchedApp?: string;
    scores: Record<string, number>;
  } {
    const signals: string[] = [];
    const scores: Record<string, number> = {};
    let totalScore = 0;
    let matchedDomain: string | undefined;
    let matchedApp: string | undefined;

    let parsedUrl: URL | null = null;
    try {
      if (url) parsedUrl = new URL(url);
    } catch {
      // url might be partial
    }

    const hostname = parsedUrl ? parsedUrl.hostname.toLowerCase() : '';
    const fullUrl = url.toLowerCase();

    // 1. Domain & URL pattern evaluation from configurable signatures
    for (const app of this.aiSiteSignatures) {
      const domainMatch = app.domains.some(
        (d) => hostname === d || hostname.endsWith(`.${d}`) || fullUrl.includes(d)
      );

      if (domainMatch) {
        if (!app.urlPatterns || app.urlPatterns.length === 0) {
          const sig = `AI_DOMAIN_${app.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
          signals.push(sig);
          scores[sig] = 85;
          totalScore += 85;
          matchedDomain = hostname || app.domains[0];
          matchedApp = app.name;
          break;
        } else {
          const path = parsedUrl ? parsedUrl.pathname : url;
          const matchesPattern = app.urlPatterns.some((pat) => pat.test(path));
          if (matchesPattern) {
            const sig = `AI_DOMAIN_PATTERN_${app.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
            signals.push(sig);
            scores[sig] = 85;
            totalScore += 85;
            matchedDomain = hostname || app.domains[0];
            matchedApp = app.name;
            break;
          }
        }
      }
    }

    // 2. DOM Signals: AI composer & prompt structures
    if (doc) {
      const composerSelectors = [
        '#prompt-textarea',
        'div.rich-textarea',
        'textarea[data-id]',
        'textarea[placeholder*="ask" i]',
        'textarea[placeholder*="message" i]',
        'textarea[placeholder*="prompt" i]',
        'div[contenteditable="true"][data-placeholder*="ask" i]',
        'div[contenteditable="true"][data-placeholder*="message" i]',
        'div[contenteditable="true"][data-placeholder*="prompt" i]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]',
        'textarea',
      ];
      let hasAiComposer = false;
      for (const sel of composerSelectors) {
        try {
          if (doc.querySelector(sel)) {
            hasAiComposer = true;
            break;
          }
        } catch {}
      }

      if (hasAiComposer) {
        signals.push('DOM_AI_COMPOSER');
        scores['DOM_AI_COMPOSER'] = 35;
        totalScore += 35;
      }

      const sendButtonSelectors = [
        'button[data-testid="send-button"]',
        'button[aria-label*="send prompt" i]',
        'button[aria-label*="send message" i]',
        'button[aria-label*="send" i]',
        'button.send-button',
      ];
      let hasAiSendButton = false;
      for (const sel of sendButtonSelectors) {
        try {
          if (doc.querySelector(sel)) {
            hasAiSendButton = true;
            break;
          }
        } catch {}
      }

      if (hasAiSendButton) {
        signals.push('DOM_AI_SEND_BUTTON');
        scores['DOM_AI_SEND_BUTTON'] = 30;
        totalScore += 30;
      }
    }

    // Match criteria: Known AI domain or signature (score >= 60)
    const isMatch = totalScore >= 60;
    const confidence = isMatch ? Math.min(0.99, Math.max(0.75, totalScore / 100)) : 0;

    return {
      isMatch,
      confidence,
      signals,
      matchedDomain,
      matchedApp,
      scores,
    };
  }
}

export const defaultContextDetector = new ContextDetector();
