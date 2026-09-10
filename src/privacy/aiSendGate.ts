/**
 * aiSendGate.ts
 *
 * AI Website Send-Button Privacy Gate for Privacy Firewall / VeilAgent.
 *
 * Invariant:
 * For supported AI websites (ChatGPT, Claude, Gemini, Copilot, Perplexity, etc.),
 * the user cannot submit/send page content to the AI service until local privacy
 * sanitization has completed, all detected sensitive values have been replaced
 * with approved semantic placeholders, and the resulting outgoing payload has passed
 * fail-closed privacy policy verification.
 *
 * Any content modification invalidates previous verification and immediately
 * disables submission again.
 */

import { AiSendGateState, AiSendGateEventPayload, DetectedItem } from '../core/types';
import { runAllPatterns, RegexMatch } from '../detectors/regexDetector';
import {
  getSemanticPlaceholder,
  formatPlaceholderFromVariableName,
} from '../sanitization/semanticPlaceholder';
import { evaluatePrivacyPolicy } from './policyEngine';
import { defaultContextDetector } from './contextDetector';
import { defaultAttachmentInterceptor } from '../visualPrivacy';
import { logVisualPrivacyState } from '../visualPrivacy/logger';
import { sanitizeUserOutgoingPayload } from '../provenance/contentProvenance';

// ─── Fast Deterministic String Hash ──────────────────────────────────────────

export function computeContentHash(content: string): string {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return (hash >>> 0).toString(16);
}

export function deduplicateMatches(matches: RegexMatch[]): RegexMatch[] {
  const sorted = [...matches].sort((a, b) => a.index - b.index || b.value.length - a.value.length);
  const result: RegexMatch[] = [];
  let lastEnd = -1;

  for (const m of sorted) {
    const end = m.index + m.value.length;
    if (m.index >= lastEnd) {
      result.push(m);
      lastEnd = end;
    }
  }

  return result;
}

// ─── Find Prompt Sensitive Matches (PII, Credentials, Passwords) ─────────────

export function findPromptSensitiveMatches(text: string): RegexMatch[] {
  if (!text || text.length === 0) return [];

  const matches: RegexMatch[] = [...runAllPatterns(text)];

  // Helper to test if a token is already sanitized
  const isAlreadyPlaceholder = (val: string) =>
    (val.startsWith('[') && val.endsWith(']')) ||
    val.startsWith('YOUR_') ||
    val.includes('YOUR_PASSWORD') ||
    val.includes('YOUR_API_KEY');

  // 1. Text password patterns: (password|pass|pwd|secret)[:= is] <secret>
  const passwordRegex = /(?:password|passwd|pass|pwd)\s*(?:is|[:=])\s*["']?([A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]{6,64})["']?/gi;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = passwordRegex.exec(text)) !== null) {
    if (pMatch[1]) {
      let val = pMatch[1].replace(/[.,;:]+$/, '');
      if (isAlreadyPlaceholder(val)) {
        continue;
      }
      const valIdx = pMatch.index + pMatch[0].lastIndexOf(val);
      matches.push({
        type: 'PASSWORD',
        value: val,
        index: valIdx,
        confidence: 0.95,
      });
    }
  }

  // 2. Standalone complex passwords: upper, lower, digit, special char (!@#$%^&*?)
  // Bounded by whitespace/punctuation to prevent matching code identifiers
  const standalonePassRegex = /(?:^|\s)([A-Za-z\d!@#$%^&*?]{8,64})(?=$|\s|[.,;:!?])/g;
  let sMatch: RegExpExecArray | null;
  while ((sMatch = standalonePassRegex.exec(text)) !== null) {
    if (sMatch[1]) {
      let val = sMatch[1].replace(/[.,;:]+$/, '');
      if (
        isAlreadyPlaceholder(val) ||
        /^(password|passwd|secret|token|apikey|bearer)$/i.test(val)
      ) {
        continue;
      }
      // Must contain lower, upper, digit, and special char within the token itself
      if (
        !/[a-z]/.test(val) ||
        !/[A-Z]/.test(val) ||
        !/\d/.test(val) ||
        !/[!@#$%^&*?]/.test(val)
      ) {
        continue;
      }
      const valIdx = sMatch.index + sMatch[0].indexOf(val);
      matches.push({
        type: 'PASSWORD',
        value: val,
        index: valIdx,
        confidence: 0.9,
      });
    }
  }

  // 3. API Key, Access Token, Secret Key, Session Token patterns
  const tokenRegex = /(?:api[_-]?key|access[_-]?token|auth[_-]?token|secret[_-]?key|session[_-]?token|bearer)\s*(?:is|[:=])\s*["']?([A-Za-z0-9_\-\.]{16,128})["']?/gi;
  let tMatch: RegExpExecArray | null;
  while ((tMatch = tokenRegex.exec(text)) !== null) {
    if (tMatch[1]) {
      let val = tMatch[1].replace(/[.,;:]+$/, '');
      if (isAlreadyPlaceholder(val)) {
        continue;
      }
      const valIdx = tMatch.index + tMatch[0].lastIndexOf(val);
      matches.push({
        type: 'API_KEY',
        value: val,
        index: valIdx,
        confidence: 0.95,
      });
    }
  }

  // 4. Authorization Bearer header: Bearer <token>
  const bearerRegex = /(?:Authorization:\s*)?Bearer\s+([A-Za-z0-9_\-\.]{16,128})\b/gi;
  let bMatch: RegExpExecArray | null;
  while ((bMatch = bearerRegex.exec(text)) !== null) {
    if (bMatch[1]) {
      let val = bMatch[1].replace(/[.,;:]+$/, '');
      if (isAlreadyPlaceholder(val)) {
        continue;
      }
      const valIdx = bMatch.index + bMatch[0].lastIndexOf(val);
      matches.push({
        type: 'API_KEY',
        value: val,
        index: valIdx,
        confidence: 0.95,
      });
    }
  }

  // 5. Private Key PEM blocks: -----BEGIN ... PRIVATE KEY-----
  const privateKeyRegex = /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9_-]+ )?PRIVATE KEY-----/g;
  let pkMatch: RegExpExecArray | null;
  while ((pkMatch = privateKeyRegex.exec(text)) !== null) {
    const val = pkMatch[0];
    if (isAlreadyPlaceholder(val)) continue;
    matches.push({
      type: 'PRIVATE_KEY' as any,
      value: val,
      index: pkMatch.index,
      confidence: 1.0,
    });
  }

  // 6. Generic Database URLs & Connection Strings
  const dbUrlRegex = /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis(?:s)?|mariadb|sqlite|oracle|mssql|jdbc:[a-z]+):\/\/[^\s"'<>]+/gi;
  let dbMatch: RegExpExecArray | null;
  while ((dbMatch = dbUrlRegex.exec(text)) !== null) {
    const val = dbMatch[0].replace(/[.,;:]+$/, '');
    if (isAlreadyPlaceholder(val)) continue;
    matches.push({
      type: 'DATABASE_URL' as any,
      value: val,
      index: dbMatch.index,
      confidence: 0.98,
    });
  }

  return deduplicateMatches(matches);
}

// ─── Detection Span & Semantic Placeholder Generator for AI Composer ────────

export interface DetectionSpan {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
  placeholder: string;
}

export function getDetectionSpans(text: string, matches: RegexMatch[]): DetectionSpan[] {
  if (!text || matches.length === 0) return [];

  const deduped = deduplicateMatches(matches);
  const spans: DetectionSpan[] = [];

  for (const m of deduped) {
    const beforeText = text.slice(0, m.index);
    const lineStartIndex = beforeText.lastIndexOf('\n') + 1;
    const linePrefix = beforeText.slice(lineStartIndex);

    let placeholder: string;

    const assignmentMatch = linePrefix.match(/([A-Za-z0-9_]{3,})\s*=\s*["']?$/);
    if (
      assignmentMatch &&
      assignmentMatch[1] &&
      (assignmentMatch[1].includes('_') || assignmentMatch[1] === assignmentMatch[1].toUpperCase()) &&
      !['PASSWORD', 'EMAIL', 'PHONE', 'AADHAAR', 'PAN', 'CARD'].includes(m.type) &&
      (assignmentMatch[1].includes('KEY') || assignmentMatch[1].includes('SECRET') || assignmentMatch[1].includes('TOKEN') || assignmentMatch[1].includes('URL') || assignmentMatch[1].includes('CONFIG'))
    ) {
      const varName = assignmentMatch[1].trim();
      placeholder = formatPlaceholderFromVariableName(varName);
    } else {
      switch (m.type as string) {
        case 'PHONE':
          placeholder = '[PHONE_NUMBER]';
          break;
        case 'EMAIL':
          placeholder = '[EMAIL]';
          break;
        case 'PASSWORD':
          placeholder = '[PASSWORD]';
          break;
        case 'CARD':
          placeholder = '[CREDIT_CARD]';
          break;
        case 'AADHAAR':
          placeholder = '[AADHAAR]';
          break;
        case 'PAN':
          placeholder = '[PAN]';
          break;
        case 'JWT_SECRET':
        case 'JWT':
          placeholder = '[JWT]';
          break;
        case 'MONGODB_URL':
        case 'POSTGRES_URL':
        case 'MYSQL_URL':
        case 'REDIS_URL':
        case 'DATABASE_URL':
          placeholder = '[DATABASE_URL]';
          break;
        case 'PRIVATE_KEY':
          placeholder = '[PRIVATE_KEY]';
          break;
        case 'API_KEY':
        case 'OPENAI_KEY':
        case 'ANTHROPIC_KEY':
        case 'GOOGLE_KEY':
        case 'GITHUB_TOKEN':
        case 'AWS_KEY':
        case 'AZURE_KEY':
        case 'SUPABASE_KEY':
        case 'FIREBASE_CONFIG':
        case 'STRIPE_KEY':
        case 'RAZORPAY_KEY':
        case 'TOKEN':
        case 'ACCESS_TOKEN':
        case 'SECRET_KEY':
        case 'AUTH_TOKEN':
        case 'SESSION_TOKEN':
          placeholder = '[API_KEY]';
          break;
        default:
          placeholder = getSemanticPlaceholder(m.type);
          break;
      }
    }

    spans.push({
      type: m.type,
      value: m.value,
      start: m.index,
      end: m.index + m.value.length,
      confidence: m.confidence,
      placeholder,
    });
  }

  return spans;
}

export function replaceWithAiSemanticPlaceholders(
  rawText: string,
  matches: RegexMatch[]
): {
  sanitizedText: string;
  replacementCount: number;
  detectedItems: DetectedItem[];
  spans: DetectionSpan[];
} {
  if (!rawText || matches.length === 0) {
    return { sanitizedText: rawText, replacementCount: 0, detectedItems: [], spans: [] };
  }

  const spans = getDetectionSpans(rawText, matches);
  // Sort RIGHT -> LEFT (descending order of start offset) so character replacements do not drift
  const sortedSpans = [...spans].sort((a, b) => b.start - a.start);

  let currentText = rawText;
  const detectedItems: DetectedItem[] = [];

  for (const span of sortedSpans) {
    // Replace the exact detection span [span.start, span.end] with its approved semantic placeholder
    currentText =
      currentText.slice(0, span.start) +
      span.placeholder +
      currentText.slice(span.end);

    detectedItems.push({
      id: `ai_${span.start}`,
      type: span.type as any,
      value: span.value,
      confidence: span.confidence,
      method: 'regex',
      status: 'redacted',
      placeholder: span.placeholder,
      semanticPlaceholder: span.placeholder,
      timestamp: Date.now(),
      location: {
        boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      },
    });
  }

  return {
    sanitizedText: currentText,
    replacementCount: sortedSpans.length,
    detectedItems,
    spans,
  };
}

// ─── AI Send Gate Controller ─────────────────────────────────────────────────

export interface AiSendGateSendState {
  status:
    | 'DISABLED'
    | 'ANALYZING'
    | 'SAFE'
    | 'SENSITIVE_DETECTED'
    | 'SANITIZING'
    | 'SANITIZED'
    | 'VERIFIED'
    | 'FAILED'
    | 'ERROR'
    | 'REDACTING';
  verified: boolean;
  hash: string | null;
}

export class AiSendGate {
  public composerEnabled: boolean = true;
  public sendState: AiSendGateSendState = {
    status: 'DISABLED',
    verified: false,
    hash: null,
  };
  public attachmentInterceptor: any = defaultAttachmentInterceptor;

  private state: AiSendGateState = 'AI_SITE_DETECTED';
  private verifiedHash: string | null = null;
  private currentScanId: number = 0;
  private isEnabled: boolean = false;
  private activeComposer: HTMLElement | null = null;
  private activeSendButton: HTMLElement | null = null;
  private statusBadge: HTMLElement | null = null;
  private isUpdatingDom: boolean = false;
  private isSyntheticSubmission: boolean = false;
  private boundGlobalInput: ((e: Event) => void) | null = null;
  private boundGlobalFocus: ((e: Event) => void) | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private observerDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private mutationObserver: MutationObserver | null = null;
  private boundOnInput: ((e: Event) => void) | null = null;
  private boundOnClick: ((e: Event) => void) | null = null;
  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundOnSubmit: ((e: Event) => void) | null = null;

  constructor() {}

  /**
   * Initializes the Send Gate on the current page if it is an AI website.
   * Returns true if active, false if not an AI website.
   */
  init(url?: string, doc?: Document): boolean {
    const targetDoc = doc || (typeof document !== 'undefined' ? document : undefined);
    const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

    const contextResult = defaultContextDetector.detectContext(targetUrl, targetDoc);
    const composer = this.findComposer();
    if (contextResult.context !== 'AI_ASSISTANT' && !composer) {
      this.destroy();
      return false;
    }

    if (this.isEnabled) return true;
    this.isEnabled = true;

    this.composerEnabled = true;
    this.sendState = {
      status: 'DISABLED',
      verified: false,
      hash: null,
    };
    this.state = 'AI_SITE_DETECTED';

    this.findAndBindElements();
    this.attachGlobalInterceptors();
    this.startObserver();

    // Initial state: composer ENABLED, send DISABLED, badge hidden
    const activeComp = this.findComposer();
    this.ensureComposerUsable(activeComp);
    this.updateSendButtonState(false);
    this.hideBadge();

    return true;
  }

  /**
   * Cleans up all listeners, observers, and UI badges.
   */
  destroy(): void {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.observerDebounceTimer) {
      clearTimeout(this.observerDebounceTimer);
      this.observerDebounceTimer = null;
    }

    this.mutationObserver?.disconnect();
    this.mutationObserver = null;

    this.detachGlobalInterceptors();

    if (this.activeSendButton) {
      if ('disabled' in this.activeSendButton) {
        (this.activeSendButton as HTMLButtonElement).disabled = false;
      }
      this.activeSendButton.removeAttribute('aria-disabled');
      this.activeSendButton.removeAttribute('data-pf-gate-disabled');
      try {
        this.activeSendButton.style.removeProperty('pointer-events');
        this.activeSendButton.style.removeProperty('opacity');
        this.activeSendButton.style.removeProperty('cursor');
      } catch {}
      this.activeSendButton = null;
    }

    if (this.statusBadge && this.statusBadge.parentNode) {
      this.statusBadge.parentNode.removeChild(this.statusBadge);
      this.statusBadge = null;
    }

    this.activeComposer = null;
    this.verifiedHash = null;
    this.sendState = {
      status: 'DISABLED',
      verified: false,
      hash: null,
    };
    this.state = 'AI_SITE_DETECTED';
  }

  // ─── Getters ───────────────────────────────────────────────────────────────

  getState(): AiSendGateState {
    return this.state;
  }

  getVerifiedHash(): string | null {
    return this.verifiedHash;
  }

  isSubmissionAllowed(): boolean {
    const interceptor = this.attachmentInterceptor || defaultAttachmentInterceptor;
    const attachmentState = interceptor.getAttachmentPrivacyState();

    // Attachment must NOT be actively processing or failed
    if (attachmentState === 'PROCESSING') return false;
    if (attachmentState === 'FAILED') return false;

    // Validate that all tracked attachments are strictly sanitized and ready for upload
    if (typeof (interceptor as any).validateAttachmentsForSubmission === 'function') {
      const attValidation = (interceptor as any).validateAttachmentsForSubmission();
      if (!attValidation.valid) return false;
    }

    // Text content check
    const current = this.getComposerText();
    const hasText = Boolean(current && current.trim());
    const hasVerifiedAttachment = attachmentState === 'VERIFIED';

    // Must have at least valid text or verified attachment (or both)
    if (!hasText && !hasVerifiedAttachment) return false;

    if (hasText) {
      if (this.state !== 'READY' && this.state !== 'VERIFIED') return false;
      if (!this.sendState.verified || this.sendState.status !== 'VERIFIED') return false;
      if (this.verifiedHash === null || this.verifiedHash !== computeContentHash(current)) {
        return false;
      }
    }

    return true;
  }

  isSendAllowed(): boolean {
    return this.isSubmissionAllowed();
  }

  getPrivacyState(): string {
    if (this.sendState.status === 'VERIFIED') return 'VERIFIED';
    if (this.sendState.status === 'SENSITIVE_DETECTED') return 'DETECTED';
    if (this.sendState.status === 'SANITIZING') return 'SANITIZING';
    if (this.sendState.status === 'SANITIZED') return 'SANITIZED';
    if (this.sendState.status === 'FAILED') return 'FAILED';
    if (this.sendState.status === 'SAFE') return 'SAFE';
    if (this.state === 'READY' || this.state === 'VERIFIED') return 'VERIFIED';
    return this.state;
  }

  evaluateSendAllowed(): boolean {
    const allowed = this.isSubmissionAllowed();
    this.updateSendButtonState(allowed);
    if (allowed) {
      this.updateBadge('🔒 Sensitive information protected locally', 'verified');
    }
    const interceptor = this.attachmentInterceptor || defaultAttachmentInterceptor;
    logVisualPrivacyState('SEND_GATE_EVALUATED', {
      canSend: allowed,
      gateState: this.state,
      sendState: this.sendState.status,
      attachmentState: interceptor.getAttachmentPrivacyState(),
    });
    if (allowed) {
      logVisualPrivacyState('SEND_ENABLED');
    }
    return allowed;
  }

  getActiveComposer(): HTMLElement | null {
    return this.activeComposer;
  }

  getActiveSendButton(): HTMLElement | null {
    return this.activeSendButton;
  }

  // ─── Composer Usability Guarantee ───────────────────────────────────────────

  /**
   * Guarantees that the composer element is ALWAYS editable, typable, and never disabled.
   */
  ensureComposerUsable(composer: HTMLElement | null = this.findComposer()): void {
    this.composerEnabled = true;
    if (!composer) return;

    if (composer instanceof HTMLInputElement || composer instanceof HTMLTextAreaElement) {
      if (composer.disabled) composer.disabled = false;
      if (composer.readOnly) composer.readOnly = false;
    }
    if (composer.getAttribute('contenteditable') === 'false') {
      composer.setAttribute('contenteditable', 'true');
    }
    if (composer.style.pointerEvents === 'none') {
      composer.style.removeProperty('pointer-events');
    }
    if (composer.hasAttribute('disabled')) {
      composer.removeAttribute('disabled');
    }
    if (composer.hasAttribute('readonly')) {
      composer.removeAttribute('readonly');
    }
    if (composer.hasAttribute('aria-disabled')) {
      composer.removeAttribute('aria-disabled');
    }
  }

  // ─── State Management ──────────────────────────────────────────────────────

  private setState(newState: AiSendGateState): void {
    this.state = newState;

    switch (newState) {
      case 'AI_SITE_DETECTED': {
        const text = this.getComposerText();
        this.updateSendButtonState(false);
        if (text && text.trim().length > 0) {
          this.updateBadge('🔒 Privacy check in progress…', 'pending');
        } else {
          this.hideBadge();
        }
        break;
      }

      case 'ANALYZING':
        this.updateSendButtonState(false);
        this.updateBadge('🔒 Privacy check in progress…', 'pending');
        break;

      case 'SENSITIVE_DATA_FOUND':
      case 'SENSITIVE_DETECTED':
      case 'SANITIZING':
      case 'SANITIZED':
      case 'REDACTING':
      case 'PLACEHOLDERS_UPDATED':
        this.updateSendButtonState(false);
        this.updateBadge('🔒 Protecting sensitive information…', 'pending');
        break;

      case 'SAFE':
        break;

      case 'VERIFIED':
      case 'READY':
        this.updateSendButtonState(true);
        this.updateBadge('🔒 Sensitive information protected locally', 'verified');
        break;

      case 'FAILED':
      case 'ERROR':
      default:
        this.updateSendButtonState(false);
        this.updateBadge('🔒 Unable to protect sensitive information — sending blocked', 'blocked');
        break;
    }
  }

  private updateSendButtonState(enabled: boolean): void {
    const btn = this.findSendButton();
    if (!btn) return;

    // Critical invariant: NEVER disable or lock down the composer!
    const composer = this.findComposer();
    if (composer && (btn === composer || composer.contains(btn))) {
      return;
    }

    // Critical invariant: SEND_VISIBLE = true at all times!
    // The Send button must NEVER disappear, fail to render, or have styles like
    // display:none, visibility:hidden, opacity:0, or pointer-events:none applied.
    try {
      if (btn.style.display === 'none') btn.style.removeProperty('display');
      if (btn.style.visibility === 'hidden') btn.style.removeProperty('visibility');
      btn.style.removeProperty('pointer-events');
      btn.style.removeProperty('opacity');
      btn.style.removeProperty('cursor');
    } catch {}

    if (!enabled) {
      if ('disabled' in btn && !(btn as HTMLButtonElement).disabled) {
        (btn as HTMLButtonElement).disabled = true;
      }
      if (btn.getAttribute('data-pf-gate-disabled') !== 'true') {
        btn.setAttribute('data-pf-gate-disabled', 'true');
      }
      if (btn.getAttribute('aria-disabled') !== 'true') {
        btn.setAttribute('aria-disabled', 'true');
      }
    } else {
      btn.removeAttribute('data-pf-gate-disabled');
      btn.removeAttribute('aria-disabled');
      btn.removeAttribute('disabled');
      if ('disabled' in btn) {
        (btn as HTMLButtonElement).disabled = false;
      }
    }
  }

  // ─── Composer & Button Resolution ──────────────────────────────────────────

  findComposer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;

    // 1. If we already have an active composer that is still attached to DOM and not document.body, use it
    if (this.activeComposer && document.contains(this.activeComposer) && this.activeComposer !== document.body) {
      return this.activeComposer;
    }

    const targetUrl = typeof window !== 'undefined' ? window.location.href : '';
    const pagePolicy = defaultContextDetector.detectContext(
      targetUrl,
      typeof document !== 'undefined' ? document : undefined
    );
    const isAiPage = pagePolicy.context === 'AI_ASSISTANT';

    // 2. Check active focused element if it is an editable input, textarea, or contenteditable
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      const active = document.activeElement;
      const isEditable =
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLInputElement && (active.type === 'text' || !active.type || active.type === 'search' || active.type === 'tel')) ||
        active.getAttribute('contenteditable') === 'true' ||
        active.isContentEditable;
      if (isEditable) {
        const isExcluded =
          active.getAttribute('type') === 'password' ||
          active.id === '__pf_ai_send_gate_badge__';
        if (!isExcluded) {
          if (isAiPage) {
            this.activeComposer = active;
            return active;
          } else {
            const placeholder = (active.getAttribute('placeholder') || '').toLowerCase();
            const isAiComposer =
              placeholder.includes('ask') ||
              placeholder.includes('message') ||
              placeholder.includes('prompt') ||
              placeholder.includes('chat') ||
              Boolean(active.closest && active.closest('#prompt-textarea, [class*="composer" i], [class*="chat" i], form[class*="chat" i]'));
            if (isAiComposer) {
              this.activeComposer = active;
              return active;
            }
          }
        }
      }
    }

    const signatures = defaultContextDetector.getAiSignatures();
    const selectors: string[] = [];

    for (const sig of signatures) {
      if (sig.composerSelectors) selectors.push(...sig.composerSelectors);
    }

    selectors.push(
      '#prompt-textarea',
      'div.rich-textarea',
      'textarea[data-id]',
      'textarea[placeholder*="ask" i]',
      'textarea[placeholder*="message" i]',
      'textarea[placeholder*="prompt" i]',
      'textarea[placeholder*="chat" i]',
      'input[placeholder*="ask" i]',
      'input[placeholder*="message" i]',
      'input[placeholder*="prompt" i]',
      'input[placeholder*="chat" i]',
      'input.chat-input',
      'input#prompt-input',
      'div[contenteditable="true"][data-placeholder*="ask" i]',
      'div[contenteditable="true"][data-placeholder*="message" i]',
      'div[contenteditable="true"][data-placeholder*="prompt" i]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      '[contenteditable="true"]'
    );

    if (isAiPage) {
      selectors.push(
        'textarea',
        '[class*="composer" i] input',
        '[class*="chat" i] input',
        'form[class*="chat" i] input',
        'form[class*="prompt" i] input'
      );
    }

    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && el instanceof HTMLElement) {
          this.activeComposer = el;
          return el;
        }
      } catch {}
    }

    return null;
  }

  findSendButton(): HTMLElement | null {
    if (typeof document === 'undefined') return null;

    const composer = this.findComposer();

    // 1. Priority: Look inside the composer's immediate form or container
    if (composer) {
      const container =
        composer.closest('form, [class*="composer" i], [class*="prompt" i], [class*="chat" i], [class*="input" i]') ||
        composer.parentElement?.parentElement ||
        composer.parentElement;
      if (container) {
        const containerSelectors = [
          'button[data-testid="send-button"]',
          'button[data-testid*="send" i]',
          'button[aria-label*="send prompt" i]',
          'button[aria-label*="send message" i]',
          'button[aria-label*="send" i]',
          'button.send-button',
          'button.send-btn',
          'button[type="submit"]',
          'button[id*="send" i]',
          'button[class*="send" i]',
        ];
        for (const sel of containerSelectors) {
          try {
            const btn = container.querySelector(sel);
            if (btn && btn instanceof HTMLElement && btn !== composer && !composer.contains(btn)) {
              this.activeSendButton = btn;
              return btn;
            }
          } catch {}
        }
      }
    }

    // 2. Secondary: Try explicit AI signatures
    const signatures = defaultContextDetector.getAiSignatures();
    for (const sig of signatures) {
      if (sig.sendButtonSelectors) {
        for (const sel of sig.sendButtonSelectors) {
          try {
            const btn = document.querySelector(sel);
            if (btn && btn instanceof HTMLElement && btn !== composer && !composer?.contains(btn)) {
              this.activeSendButton = btn;
              return btn;
            }
          } catch {}
        }
      }
    }

    // 3. Fallback: Global explicit send button selectors
    const fallbackSelectors = [
      'button[data-testid="send-button"]',
      'button[data-testid*="send" i]',
      'button[aria-label*="send prompt" i]',
      'button[aria-label*="send message" i]',
      'button[aria-label*="send" i]',
      'button.send-button',
      'button.send-btn',
      'button[id*="send" i]',
    ];
    for (const sel of fallbackSelectors) {
      try {
        const btn = document.querySelector(sel);
        if (btn && btn instanceof HTMLElement && btn !== composer && !composer?.contains(btn)) {
          this.activeSendButton = btn;
          return btn;
        }
      } catch {}
    }

    return null;
  }

  getComposerText(): string {
    const el = this.findComposer();
    if (!el) return '';
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      return el.value || '';
    }
    return el.innerText || el.textContent || '';
  }

  /**
   * Directional Privacy Boundary:
   * Returns safely sanitized outgoing user payload without modifying webpage-owned content.
   */
  getOutgoingPayload(rawText?: string): string {
    const text = rawText !== undefined ? rawText : this.getComposerText();
    const { sanitizedText } = sanitizeUserOutgoingPayload(text);
    return sanitizedText;
  }

  setComposerText(newText: string): void {
    const el = this.findComposer();
    if (!el) return;

    this.isUpdatingDom = true;
    try {
      if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
        const prevStart = el.selectionStart;
        const prevEnd = el.selectionEnd;
        const prevLen = el.value.length;
        const prevVal = el.value;

        try {
          el.focus();
        } catch {}

        // 1. Try native browser execCommand on selected text (framework-native in Chrome)
        let execOk = false;
        try {
          el.setSelectionRange(0, el.value.length);
          execOk = document.execCommand('insertText', false, newText);
        } catch {}

        // 2. If execCommand didn't update value (e.g. in test env or unsupported), use native setter
        if (!execOk || el.value !== newText) {
          const prototype = el instanceof HTMLTextAreaElement
            ? (typeof window !== 'undefined' ? window.HTMLTextAreaElement?.prototype : null)
            : (typeof window !== 'undefined' ? window.HTMLInputElement?.prototype : null);
          const nativeSetter = prototype ? Object.getOwnPropertyDescriptor(prototype, 'value')?.set : null;

          if (nativeSetter) {
            nativeSetter.call(el, newText);
          } else {
            el.value = newText;
          }

          // Reset React 16+ internal _valueTracker to prevVal so React state updater recognizes the change
          try {
            const tracker = (el as any)._valueTracker;
            if (tracker) {
              tracker.setValue(prevVal);
            }
          } catch {}
        }

        // 3. Restore cursor position proportionally if length changed
        try {
          if (prevStart !== null && prevEnd !== null) {
            const diff = newText.length - prevLen;
            const newCursor = Math.min(newText.length, Math.max(0, prevStart + diff));
            el.setSelectionRange(newCursor, newCursor);
          }
        } catch {}

        // 4. Dispatch beforeinput, input, and change events for framework reactivity
        try {
          if (typeof InputEvent !== 'undefined') {
            try {
              el.dispatchEvent(new InputEvent('beforeinput', {
                bubbles: true,
                cancelable: true,
                composed: true,
                inputType: 'insertText',
                data: newText,
              }));
            } catch {}
            el.dispatchEvent(new InputEvent('input', {
              bubbles: true,
              cancelable: true,
              composed: true,
              inputType: 'insertText',
              data: newText,
            }));
          } else {
            el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          }
          el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        } catch {}
      } else {
        // Contenteditable (Claude, Gemini, Copilot, rich textareas)
        try {
          el.focus();
        } catch {}

        let execOk = false;
        try {
          if (typeof window !== 'undefined' && window.getSelection && document.createRange) {
            const selection = window.getSelection();
            if (selection) {
              const range = document.createRange();
              range.selectNodeContents(el);
              selection.removeAllRanges();
              selection.addRange(range);
              try {
                document.execCommand('delete', false);
              } catch {}
              execOk = document.execCommand('insertText', false, newText);
            }
          }
        } catch {}

        if (!execOk || (el.innerText !== newText && el.textContent !== newText)) {
          const innerP = el.querySelector('p');
          if (innerP) {
            innerP.textContent = newText;
          } else {
            el.innerText = newText;
            el.textContent = newText;
          }
        }

        // Move selection cursor to the end of contenteditable
        try {
          if (typeof window !== 'undefined' && window.getSelection && document.createRange) {
            const sel = window.getSelection();
            if (sel) {
              const r = document.createRange();
              r.selectNodeContents(el);
              r.collapse(false);
              sel.removeAllRanges();
              sel.addRange(r);
            }
          }
        } catch {}

        try {
          if (typeof InputEvent !== 'undefined') {
            try {
              el.dispatchEvent(new InputEvent('beforeinput', {
                bubbles: true,
                cancelable: true,
                composed: true,
                inputType: 'insertText',
                data: newText,
              }));
            } catch {}
            el.dispatchEvent(new InputEvent('input', {
              bubbles: true,
              cancelable: true,
              composed: true,
              inputType: 'insertText',
              data: newText,
            }));
          } else {
            el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          }
          el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        } catch {}
      }
    } finally {
      this.isUpdatingDom = false;
    }
  }


  // ─── Content Evaluation & Privacy Sanitization ──────────────────────────────

  /**
   * Called when user types or edits content. Immediately invalidates previous verification.
   */
  handleContentChange(immediate: boolean = false): void {
    if (this.isUpdatingDom) return;

    // Ensure composer remains usable at all times
    this.ensureComposerUsable(this.findComposer());

    const currentText = this.getComposerText();
    const currentHash = computeContentHash(currentText);

    // Empty composer: send DISABLED, badge hidden, composer ENABLED
    if (!currentText || !currentText.trim()) {
      this.verifiedHash = null;
      this.sendState = {
        status: 'DISABLED',
        verified: false,
        hash: null,
      };
      this.setState('AI_SITE_DETECTED');
      this.updateSendButtonState(false);
      this.hideBadge();
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      return;
    }

    // If verified hash does not match current content, immediately lock down send
    if (this.verifiedHash !== currentHash) {
      this.verifiedHash = null;
      this.sendState = {
        status: 'ANALYZING',
        verified: false,
        hash: null,
      };
      this.setState('ANALYZING');
      this.updateSendButtonState(false);

      this.currentScanId++;
      const scanId = this.currentScanId;

      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      if (immediate) {
        this.debounceTimer = null;
        this.processAndVerifyContent(scanId, true);
      } else {
        this.debounceTimer = setTimeout(() => {
          this.processAndVerifyContent(scanId, true);
        }, 75);
      }
    }
  }

  /**
   * Core analysis, redaction, and verification pipeline.
   * State Machine:
   * SAFE -> SENSITIVE_DETECTED -> SANITIZING -> SANITIZED -> VERIFIED -> SEND ENABLED
   * Failure: SENSITIVE_DETECTED -> SANITIZING -> FAILED -> SEND BLOCKED
   */
  async processAndVerifyContent(
    scanId: number = this.currentScanId,
    autoApplyDomRedaction: boolean = true
  ): Promise<boolean> {
    this.ensureComposerUsable(this.findComposer());

    const textToScan = this.getComposerText();
    const hashAtStart = computeContentHash(textToScan);

    // Empty prompt: check if a verified sanitized attachment exists
    if (!textToScan || !textToScan.trim()) {
      const interceptor = this.attachmentInterceptor || defaultAttachmentInterceptor;
      const hasVerifiedAttachment = interceptor.getAttachmentPrivacyState() === 'VERIFIED';
      if (hasVerifiedAttachment) {
        this.verifiedHash = hashAtStart;
        this.sendState = {
          status: 'VERIFIED',
          verified: true,
          hash: hashAtStart,
        };
        this.setState('VERIFIED');
        this.setState('READY');
        this.evaluateSendAllowed();
        return true;
      }
      this.verifiedHash = null;
      this.sendState = {
        status: 'DISABLED',
        verified: false,
        hash: null,
      };
      this.setState('AI_SITE_DETECTED');
      this.evaluateSendAllowed();
      this.hideBadge();
      return false;
    }

    // Race condition check: user typed another character while debouncing
    if (scanId !== this.currentScanId) {
      return false;
    }

    try {
      this.sendState.status = 'ANALYZING';
      this.setState('ANALYZING');

      // 1. Run local detection (PII, credentials, and passwords)
      const matches = findPromptSensitiveMatches(textToScan);

      // Race condition check during scanning
      if (scanId !== this.currentScanId || computeContentHash(this.getComposerText()) !== hashAtStart) {
        this.sendState = { status: 'ANALYZING', verified: false, hash: null };
        this.setState('ANALYZING');
        this.evaluateSendAllowed();
        return false;
      }

      // 2. Branch: sensitive data found vs clean content
      if (matches.length === 0) {
        // No sensitive data detected
        this.setState('SAFE');
        const isClean = this.verifyOutgoingPayload(textToScan, []);
        if (!isClean) {
          this.sendState = { status: 'FAILED', verified: false, hash: null };
          this.setState('FAILED');
          this.evaluateSendAllowed();
          this.logAuditEvent('AI_SEND_BLOCKED', 'POLICY_VIOLATION');
          return false;
        }

        this.verifiedHash = hashAtStart;
        this.sendState = {
          status: 'VERIFIED',
          verified: true,
          hash: hashAtStart,
        };
        this.setState('VERIFIED');
        this.setState('READY');
        this.evaluateSendAllowed();
        this.logAuditEvent('AI_SEND_ALLOWED', 'NO_SENSITIVE_DATA');
        return true;
      }

      // Sensitive data detected: transition to SENSITIVE_DETECTED -> SANITIZING
      this.sendState = { status: 'SENSITIVE_DETECTED', verified: false, hash: null };
      this.setState('SENSITIVE_DETECTED');
      this.updateSendButtonState(false);

      this.sendState = { status: 'SANITIZING', verified: false, hash: null };
      this.setState('SANITIZING');
      this.updateBadge('🔒 Protecting sensitive information…', 'pending');

      // 3. Apply semantic placeholders using exact detection spans
      const { sanitizedText, replacementCount, detectedItems } = replaceWithAiSemanticPlaceholders(
        textToScan,
        matches
      );

      // Race condition check during redaction
      if (scanId !== this.currentScanId || computeContentHash(this.getComposerText()) !== hashAtStart) {
        this.sendState = { status: 'ANALYZING', verified: false, hash: null };
        this.setState('ANALYZING');
        this.updateSendButtonState(false);
        return false;
      }

      // Update composer in DOM (with framework safety & cursor preservation)
      this.setComposerText(sanitizedText);

      this.sendState = { status: 'SANITIZED', verified: false, hash: null };
      this.setState('SANITIZED');

      // 4. Critical Outgoing Payload Verification on actual DOM content
      const domText = this.getComposerText();
      const verificationPassed = this.verifyOutgoingPayload(domText, matches);
      if (!verificationPassed) {
        // DOM still contains raw sensitive values! Keep button locked!
        this.sendState = { status: 'FAILED', verified: false, hash: null };
        this.setState('FAILED');
        this.updateSendButtonState(false);
        this.updateBadge('🔒 Unable to protect sensitive information — sending blocked', 'blocked');
        this.logAuditEvent('AI_SEND_BLOCKED', 'PLACEHOLDER_VERIFICATION_FAILED');
        return false;
      }

      // If replacements were made, verify that the placeholder exists in DOM
      const hasSemanticPlaceholder =
        domText.includes('[') ||
        domText.includes('YOUR_') ||
        domText.includes('[PHONE_NUMBER]') ||
        domText.includes('[EMAIL]') ||
        domText.includes('[API_KEY]');

      if (replacementCount > 0 && !hasSemanticPlaceholder) {
        this.sendState = { status: 'FAILED', verified: false, hash: null };
        this.setState('FAILED');
        this.updateSendButtonState(false);
        this.updateBadge('🔒 Unable to protect sensitive information — sending blocked', 'blocked');
        return false;
      }

      const newHash = computeContentHash(domText);
      this.verifiedHash = newHash;
      this.sendState = {
        status: 'VERIFIED',
        verified: true,
        hash: newHash,
      };
      this.setState('VERIFIED');
      this.setState('READY');
      this.evaluateSendAllowed();
      this.updateBadge('🔒 Sensitive information protected locally', 'verified');
      this.logAuditEvent('AI_SEND_ALLOWED', 'PRIVACY_VERIFIED', detectedItems.length, replacementCount);
      return true;
    } catch (err) {
      // Fail closed on any exception
      this.sendState = { status: 'FAILED', verified: false, hash: null };
      this.setState('FAILED');
      this.updateSendButtonState(false);
      this.updateBadge('🔒 Unable to protect sensitive information — sending blocked', 'blocked');
      this.logAuditEvent('AI_SEND_BLOCKED', 'SCANNER_ERROR');
      return false;
    }
  }

  /**
   * Verifies the exact outgoing text against fail-closed privacy policy.
   */
  verifyOutgoingPayload(text: string, originalMatches: RegexMatch[]): boolean {
    if (!text && text !== '') return false;

    // A. Verify no original raw sensitive values remain in text
    for (const m of originalMatches) {
      if (text.includes(m.value)) {
        return false;
      }
    }

    // B. Re-run regex patterns on outgoing text
    const residualMatches = findPromptSensitiveMatches(text);
    if (residualMatches.length > 0) {
      return false;
    }

    // C. Validate payload using existing policy engine
    const evalResult = evaluatePrivacyPolicy(
      {
        taskDescription: text,
        domStructure: '<div></div>',
        accessibilityTree: [],
        url: typeof window !== 'undefined' ? window.location.href : '',
      },
      []
    );

    return evalResult.safe;
  }

  // ─── Submission Interception ───────────────────────────────────────────────

  private attachGlobalInterceptors(): void {
    if (typeof window === 'undefined') return;

    this.boundOnClick = (e: Event) => this.handleCaptureClick(e);
    this.boundOnKeyDown = (e: KeyboardEvent) => this.handleCaptureKeyDown(e);
    this.boundOnSubmit = (e: Event) => this.handleCaptureSubmit(e);

    this.boundGlobalInput = (e: Event) => {
      if (this.isUpdatingDom) return;
      const target = e.target as HTMLElement;
      if (!target) return;
      const isEditable =
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && (target.type === 'text' || !target.type || target.type === 'search' || target.type === 'tel')) ||
        target.getAttribute('contenteditable') === 'true' ||
        target.isContentEditable;
      if (isEditable && target.id !== '__pf_ai_send_gate_badge__') {
        this.activeComposer = target;
        this.ensureComposerUsable(target);
        this.handleContentChange();
      }
    };

    this.boundGlobalFocus = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const isEditable =
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && (target.type === 'text' || !target.type || target.type === 'search' || target.type === 'tel')) ||
        target.getAttribute('contenteditable') === 'true' ||
        target.isContentEditable;
      if (isEditable && target.id !== '__pf_ai_send_gate_badge__') {
        this.activeComposer = target;
        this.ensureComposerUsable(target);
      }
    };

    window.addEventListener('click', this.boundOnClick, { capture: true, passive: false });
    window.addEventListener('keydown', this.boundOnKeyDown as EventListener, { capture: true, passive: false });
    window.addEventListener('submit', this.boundOnSubmit, { capture: true, passive: false });
    window.addEventListener('input', this.boundGlobalInput, { capture: true, passive: true });
    window.addEventListener('focusin', this.boundGlobalFocus, { capture: true, passive: true });
  }

  private detachGlobalInterceptors(): void {
    if (typeof window === 'undefined') return;

    if (this.boundOnClick) {
      window.removeEventListener('click', this.boundOnClick, { capture: true });
      this.boundOnClick = null;
    }
    if (this.boundOnKeyDown) {
      window.removeEventListener('keydown', this.boundOnKeyDown as EventListener, { capture: true });
      this.boundOnKeyDown = null;
    }
    if (this.boundOnSubmit) {
      window.removeEventListener('submit', this.boundOnSubmit, { capture: true });
      this.boundOnSubmit = null;
    }
    if (this.boundGlobalInput) {
      window.removeEventListener('input', this.boundGlobalInput, { capture: true });
      this.boundGlobalInput = null;
    }
    if (this.boundGlobalFocus) {
      window.removeEventListener('focusin', this.boundGlobalFocus, { capture: true });
      this.boundGlobalFocus = null;
    }
  }

  private handleCaptureClick(e: Event): void {
    if (this.isSyntheticSubmission) return;

    const target = e.target as HTMLElement;
    if (!target) return;

    const sendBtn = this.findSendButton();
    const composer = this.findComposer();
    const container = composer
      ? composer.closest('form, [class*="composer" i], [class*="prompt" i], [class*="chat" i], [class*="input" i]') ||
        composer.parentElement
      : null;

    const isInsideComposerContainer = container && (target === container || container.contains(target));

    const isSendButtonClick =
      (sendBtn && (target === sendBtn || sendBtn.contains(target))) ||
      (isInsideComposerContainer &&
        target.closest &&
        Boolean(
          target.closest('button[data-testid*="send" i]') ||
          target.closest('button[aria-label*="send" i]') ||
          target.closest('button[type="submit"]') ||
          target.closest('button.send-button') ||
          target.closest('button.send-btn')
        ));

    // NEVER block clicks on normal page buttons, links, or navigation
    if (!isSendButtonClick) {
      return;
    }

    const currentText = this.getComposerText();
    const currentHash = computeContentHash(currentText);
    const hasText = Boolean(currentText && currentText.trim());
    const isAllowed =
      this.isSubmissionAllowed() &&
      (!hasText ||
        (this.sendState.verified &&
          this.sendState.hash === currentHash &&
          this.verifyOutgoingPayload(currentText, [])));

    if (!isAllowed) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.updateSendButtonState(false);
      this.logAuditEvent('AI_SEND_BLOCKED', 'SANITIZATION_PENDING');

      // Schedule sanitization pipeline to rewrite secrets to semantic placeholders and post!
      setTimeout(() => {
        this.processAndVerifyContent(this.currentScanId, true).then((verified) => {
          if (verified && this.isSubmissionAllowed()) {
            this.updateSendButtonState(true);
            const activeBtn = this.findSendButton() || sendBtn;
            if (activeBtn) {
              if ('disabled' in activeBtn) {
                (activeBtn as HTMLButtonElement).disabled = false;
              }
              activeBtn.removeAttribute('disabled');
              try {
                activeBtn.style.removeProperty('pointer-events');
              } catch {}
              this.isSyntheticSubmission = true;
              try {
                activeBtn.click();
              } finally {
                this.isSyntheticSubmission = false;
              }
            }
          } else {
            this.flashWarning();
          }
        });
      }, 0);
    }
  }

  private handleCaptureKeyDown(e: KeyboardEvent): void {
    if (this.isSyntheticSubmission) return;

    // Only care about Enter key submission
    if (e.key !== 'Enter') return;

    // Shift+Enter and Alt+Enter are multiline editing, NOT submission
    if (e.shiftKey || e.altKey) {
      return;
    }

    const target = e.target as HTMLElement;
    const composer = this.findComposer();

    const isInsideComposer = composer && (target === composer || composer.contains(target));
    // NEVER block keyboard interaction outside the active AI composer
    if (!isInsideComposer) {
      return;
    }

    const currentText = this.getComposerText();
    const currentHash = computeContentHash(currentText);
    const hasText = Boolean(currentText && currentText.trim());
    const isAllowed =
      this.isSubmissionAllowed() &&
      (!hasText ||
        (this.sendState.verified &&
          this.sendState.hash === currentHash &&
          this.verifyOutgoingPayload(currentText, [])));

    if (!isAllowed) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.updateSendButtonState(false);
      this.logAuditEvent('AI_SEND_BLOCKED', 'SANITIZATION_PENDING');

      // Schedule sanitization pipeline to rewrite secrets to semantic placeholders and post!
      setTimeout(() => {
        this.processAndVerifyContent(this.currentScanId, true).then((verified) => {
          if (verified && this.isSubmissionAllowed()) {
            this.updateSendButtonState(true);
            const activeBtn = this.findSendButton();
            if (activeBtn) {
              if ('disabled' in activeBtn) {
                (activeBtn as HTMLButtonElement).disabled = false;
              }
              activeBtn.removeAttribute('disabled');
              try {
                activeBtn.style.removeProperty('pointer-events');
              } catch {}
              this.isSyntheticSubmission = true;
              try {
                activeBtn.click();
              } finally {
                this.isSyntheticSubmission = false;
              }
            } else {
              const form = composer.closest('form');
              if (form) {
                this.isSyntheticSubmission = true;
                try {
                  if (typeof form.requestSubmit === 'function') {
                    form.requestSubmit();
                  } else {
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                  }
                } finally {
                  this.isSyntheticSubmission = false;
                }
              } else {
                this.isSyntheticSubmission = true;
                try {
                  composer.dispatchEvent(
                    new KeyboardEvent('keydown', {
                      key: 'Enter',
                      code: 'Enter',
                      keyCode: 13,
                      which: 13,
                      bubbles: true,
                      cancelable: true,
                    })
                  );
                } finally {
                  this.isSyntheticSubmission = false;
                }
              }
            }
          } else {
            this.flashWarning();
          }
        });
      }, 0);
    }
  }

  private handleCaptureSubmit(e: Event): void {
    if (this.isSyntheticSubmission) return;

    const target = e.target as HTMLElement;
    const composer = this.findComposer();

    // Critical: Only intercept if the submitted form actually contains the AI composer!
    // Never block unrelated forms on the page (search, preferences, login, settings, modals)
    const isComposerForm =
      composer &&
      target instanceof HTMLFormElement &&
      target.contains(composer);

    if (!isComposerForm) {
      return;
    }

    const currentText = this.getComposerText();
    const currentHash = computeContentHash(currentText);
    const hasText = Boolean(currentText && currentText.trim());
    const isAllowed =
      this.isSubmissionAllowed() &&
      (!hasText ||
        (this.sendState.verified &&
          this.sendState.hash === currentHash &&
          this.verifyOutgoingPayload(currentText, [])));

    if (!isAllowed) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.updateSendButtonState(false);
      this.logAuditEvent('AI_SEND_BLOCKED', 'SANITIZATION_PENDING');

      setTimeout(() => {
        this.processAndVerifyContent(this.currentScanId, true).then((verified) => {
          if (verified && this.isSubmissionAllowed()) {
            this.updateSendButtonState(true);
            const form = target as HTMLFormElement;
            this.isSyntheticSubmission = true;
            try {
              if (typeof form.requestSubmit === 'function') {
                form.requestSubmit();
              } else {
                form.submit();
              }
            } finally {
              this.isSyntheticSubmission = false;
            }
          } else {
            this.flashWarning();
          }
        });
      }, 0);
    }
  }

  // ─── DOM Observation for Dynamic SPA ───────────────────────────────────────

  private findAndBindElements(): void {
    const composer = this.findComposer();
    if (composer) {
      this.ensureComposerUsable(composer);

      if (!composer.hasAttribute('data-pf-gate-bound')) {
        composer.setAttribute('data-pf-gate-bound', 'true');

        this.boundOnInput = () => this.handleContentChange();
        composer.addEventListener('input', this.boundOnInput);
        composer.addEventListener('keyup', this.boundOnInput);
        composer.addEventListener('change', this.boundOnInput);

        composer.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === ' ' || e.key === 'Spacebar') {
            // Spacebar indicates a token boundary has completed; trigger prompt classification immediately
            setTimeout(() => this.handleContentChange(true), 0);
            return;
          }
          if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            this.verifiedHash = null;
            this.sendState.verified = false;
            this.sendState.status = 'ANALYZING';
            this.updateSendButtonState(false);
          }
        });

        // Immediately lock down send button on paste without blocking paste, then sanitize immediately
        composer.addEventListener('paste', () => {
          this.verifiedHash = null;
          this.sendState.verified = false;
          this.sendState.status = 'ANALYZING';
          this.updateSendButtonState(false);
          setTimeout(() => this.handleContentChange(true), 0);
        });
      }
    }

    const sendButton = this.findSendButton();
    if (sendButton) {
      if (!this.isSubmissionAllowed()) {
        this.updateSendButtonState(false);
      }
    }

    this.ensureBadgeMounted();
  }

  private startObserver(): void {
    if (typeof document === 'undefined' || !document.body) return;

    this.mutationObserver = new MutationObserver((mutations) => {
      // Check if any added/removed nodes contain composer, form, input, textarea, button, or contenteditable
      const hasRelevantMutation = mutations.some((m) => {
        if (m.type === 'childList') {
          for (let i = 0; i < m.addedNodes.length; i++) {
            const node = m.addedNodes[i];
            if (node instanceof HTMLElement) {
              if (
                node.id === '__pf_ai_send_gate_badge__' ||
                node.id === '__pf_overlay_root__' ||
                node.closest?.('#__pf_ai_send_gate_badge__, #__pf_overlay_root__')
              ) {
                continue;
              }
              const tagName = node.tagName ? node.tagName.toLowerCase() : '';
              if (
                tagName === 'textarea' ||
                tagName === 'form' ||
                tagName === 'input' ||
                tagName === 'button' ||
                node.isContentEditable ||
                node.querySelector?.('textarea, input, form, button, [contenteditable="true"]')
              ) {
                return true;
              }
            }
          }
        }
        return false;
      });

      if (!hasRelevantMutation) return;

      if (this.observerDebounceTimer) return;
      this.observerDebounceTimer = setTimeout(() => {
        this.observerDebounceTimer = null;
        this.findAndBindElements();
        this.ensureComposerUsable(this.findComposer());
      }, 150);
    });

    // ONLY observe childList additions/removals — NEVER observe attributes like disabled/aria-disabled
    // to prevent infinite loops and render fighting with React!
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ─── UI Status Badge ───────────────────────────────────────────────────────

  private ensureBadgeMounted(): void {
    if (typeof document === 'undefined' || !document.body) return;

    if (!this.statusBadge) {
      this.statusBadge = document.createElement('div');
      this.statusBadge.id = '__pf_ai_send_gate_badge__';
      this.statusBadge.style.cssText = `
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 2147483646;
        padding: 6px 12px;
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.2px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: none;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
        pointer-events: none;
      `;
      document.body.appendChild(this.statusBadge);
    }
  }

  hideBadge(): void {
    if (this.statusBadge) {
      this.statusBadge.style.display = 'none';
    }
  }

  private updateBadge(text: string, style: 'pending' | 'verified' | 'blocked'): void {
    this.ensureBadgeMounted();
    if (!this.statusBadge) return;

    this.statusBadge.style.display = 'flex';
    this.statusBadge.textContent = text;

    if (style === 'pending') {
      this.statusBadge.style.backgroundColor = '#1E293B';
      this.statusBadge.style.color = '#F59E0B';
      this.statusBadge.style.border = '1px solid #F59E0B44';
    } else if (style === 'verified') {
      this.statusBadge.style.backgroundColor = '#064E3B';
      this.statusBadge.style.color = '#10B981';
      this.statusBadge.style.border = '1px solid #10B98144';
    } else {
      this.statusBadge.style.backgroundColor = '#7F1D1D';
      this.statusBadge.style.color = '#EF4444';
      this.statusBadge.style.border = '1px solid #EF444444';
    }
  }

  private flashWarning(): void {
    if (!this.statusBadge) return;
    this.statusBadge.style.transform = 'scale(1.08)';
    setTimeout(() => {
      if (this.statusBadge) this.statusBadge.style.transform = 'scale(1)';
    }, 200);
  }

  // ─── Audit Logging ─────────────────────────────────────────────────────────

  private logAuditEvent(
    event: 'AI_SEND_BLOCKED' | 'AI_SEND_ALLOWED',
    reason: string,
    detectionsCount: number = 0,
    redactionsCount: number = 0
  ): void {
    const payload: AiSendGateEventPayload = {
      event,
      reason,
      url: typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '',
      detectionsCount,
      redactionsCount,
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          type: 'AI_SEND_GATE_EVENT',
          payload,
        });
      } catch {
        // Extension context might be unloaded in tests
      }
    }
  }
}

export const defaultAiSendGate = new AiSendGate();
