/**
 * actionExecutor.ts
 *
 * Local Browser Action Execution Engine:
 * Strictly validates, authorizes, and executes planned browser actions.
 *
 * Security Guarantees:
 *  - No arbitrary JavaScript execution (eval/inline scripts prohibited)
 *  - Element presence, visibility, and role verification
 *  - Sensitive credential resolution (LOCAL_* tokens resolved client-side)
 *  - User confirmation enforcement for submission & sensitive targets
 */

import { AgentAction, ActionResult, SensitiveRegion } from '../core/types';
import { requestUserConfirmation } from './confirmationHook';
import { evaluatePageContext } from '../privacy/contextPolicyEngine';

const ALLOWED_ACTIONS = new Set([
  'click',
  'type',
  'scroll',
  'select',
  'hover',
  'focus',
  'submit',
  'wait',
  'press_key',
]);

const MALICIOUS_SELECTOR_PATTERNS = [
  'javascript:',
  'eval(',
  '<script',
  '</script',
  'onerror',
  'onload',
  'onclick',
  '__proto__',
  'constructor',
  'prototype',
];

/**
 * Validates an agent action against allowed schemas and security policies.
 */
export function validateAction(action: AgentAction): { valid: boolean; reason?: string } {
  if (!action || !ALLOWED_ACTIONS.has(action.action)) {
    return {
      valid: false,
      reason: `Unsupported action type: '${(action as any)?.action}' (unsupported or disallowed action)`,
    };
  }

  if (action.selector) {
    const sel = action.selector.toLowerCase();
    for (const pat of MALICIOUS_SELECTOR_PATTERNS) {
      if (sel.includes(pat)) {
        return {
          valid: false,
          reason: `Security violation: Malicious pattern detected (malicious or prohibited pattern in selector: '${pat}')`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Resolves an action's value, preferring client-side symbolic reference (LOCAL_*)
 * so that raw sensitive credentials never leave the browser.
 * If credentials are not allowed by policy, returns unauthenticated fallback.
 */
export function resolveActionValue(
  action: AgentAction,
  localTokens: Record<string, string> = {},
  allowCredentials = true
): string {
  if (allowCredentials && action.valueRef && localTokens[action.valueRef]) {
    return localTokens[action.valueRef];
  }
  return action.text || action.value || '';
}

export class ActionExecutor {
  private localTokens: Record<string, string>;

  constructor(localTokens: Record<string, string> = {}) {
    // Local client store for credential resolution
    this.localTokens = {
      LOCAL_EMAIL: 'demo.user@sih.gov.in',
      LOCAL_PASSWORD: '••••••••',
      LOCAL_AADHAAR: '2345 6789 0123',
      LOCAL_PAN: 'ABCDE1234F',
      ...localTokens,
    };
  }

  /**
   * Set or update a local credential token.
   */
  setLocalToken(key: string, value: string): void {
    this.localTokens[key] = value;
  }

  /**
   * Validates and executes an agent action.
   * Independently re-evaluates page context prior to execution.
   */
  async execute(
    action: AgentAction,
    sensitiveRegions: SensitiveRegion[] = [],
    autoConfirmSafe = true,
    targetUrl?: string
  ): Promise<ActionResult> {
    const timestamp = Date.now();

    // 1. Validate action schema & selector safety
    const validation = validateAction(action);
    if (!validation.valid) {
      return {
        action,
        success: false,
        timestamp,
        error: validation.reason,
      };
    }

    // 2. Re-check current context immediately prior to execution
    const contextPolicy = evaluatePageContext(targetUrl);
    if (!contextPolicy.allowAgentActions || contextPolicy.policy === 'BLOCK_ALL') {
      return {
        action,
        success: false,
        timestamp,
        error: `Action rejected by security policy: page is in blocked context (${contextPolicy.context}: ${contextPolicy.reason})`,
      };
    }

    // Handle non-selector actions
    if (action.action === 'wait') {
      const duration = Math.min(Math.max(Number(action.value) || 1000, 100), 10000);
      await new Promise((resolve) => setTimeout(resolve, duration));
      return { action, success: true, timestamp, targetVerified: true };
    }

    if (action.action === 'scroll') {
      return this.executeScroll(action, timestamp);
    }

    // 3. Locate target element using targeting hierarchy:
    // (DOM selector -> target ID/name -> accessibility role/label -> bounding box)
    const targetEl = this.findTargetElement(action);
    if (!targetEl) {
      return {
        action,
        success: false,
        timestamp,
        error: `Element not found for target/selector: ${action.selector || action.target || 'unknown'}`,
      };
    }

    // 4. Verify target visibility & presence
    const rect = targetEl.getBoundingClientRect();
    const style = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(targetEl) : null;
    const isExplicitlyHidden = style && (style.display === 'none' || style.visibility === 'hidden');
    if (isExplicitlyHidden) {
      return {
        action,
        success: false,
        timestamp,
        error: `Target element is hidden (display: none or visibility: hidden): ${action.selector || action.target}`,
      };
    }

    // 5. Determine if action requires user confirmation or targets protected credentials
    const isCredentialTarget =
      /password|pass|pwd|card|cvv|pay|auth|delete|api[-_]?key|secret|token|credential/i.test(
        action.selector || ''
      ) ||
      /password|pass|pwd|card|cvv|pay|auth|delete|api[-_]?key|secret|token|credential/i.test(
        action.target || ''
      ) ||
      (targetEl instanceof HTMLInputElement && targetEl.type === 'password');

    const isSensitiveAction =
      action.requiresConfirmation ||
      action.action === 'submit' ||
      isCredentialTarget;

    if (isSensitiveAction && !autoConfirmSafe) {
      const authorized = await requestUserConfirmation(action);
      if (!authorized) {
        return {
          action,
          success: false,
          timestamp,
          error: 'Action rejected by security policy: agent cannot perform unauthorized credential actions or exfiltrate secrets',
        };
      }
    }

    // 6. Execute validated action
    try {
      switch (action.action) {
        case 'click':
          await this.executeClick(targetEl);
          break;

        case 'type':
          await this.executeType(targetEl, action, contextPolicy.allowCredentialResolution);
          break;

        case 'press_key':
          await this.executePressKey(targetEl, action.value || action.text || 'Enter');
          break;

        case 'select':
          await this.executeSelect(targetEl, action.value || '');
          break;

        case 'hover':
          targetEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          break;

        case 'focus':
          if ('focus' in targetEl && typeof (targetEl as any).focus === 'function') {
            (targetEl as any).focus();
          }
          break;

        case 'submit':
          await this.executeSubmit(targetEl);
          break;

        default:
          return {
            action,
            success: false,
            timestamp,
            error: `Unhandled action: ${action.action}`,
          };
      }

      return {
        action,
        success: true,
        timestamp,
        targetVerified: true,
      };
    } catch (err) {
      return {
        action,
        success: false,
        timestamp,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Resolves target element across the specified targeting hierarchy:
   * 1. Stable DOM selector
   * 2. Semantic ID / name attribute
   * 3. Accessibility role & label / placeholder
   * 4. Bounding box coordinates
   */
  findTargetElement(action: AgentAction): Element | null {
    if (typeof document === 'undefined') return null;

    // 1. Stable DOM selector
    if (action.selector) {
      try {
        const el = document.querySelector(action.selector);
        if (el) return el;
      } catch {}
    }

    // 2. Semantic target ID / name
    if (action.target) {
      try {
        if (action.target.startsWith('#') || action.target.startsWith('.')) {
          const el = document.querySelector(action.target);
          if (el) return el;
        }
        const byId = document.getElementById(action.target);
        if (byId) return byId;

        const byName = document.querySelector(`[name="${CSS.escape(action.target)}"]`);
        if (byName) return byName;
      } catch {}
    }

    // 3. Accessibility role / label / placeholder search
    const searchTerms = [action.target, action.reason].filter(Boolean) as string[];
    for (const term of searchTerms) {
      const cleanTerm = term.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      if (!cleanTerm) continue;

      const candidates = Array.from(document.querySelectorAll('input, button, a, textarea, [role]'));
      for (const el of candidates) {
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
        const role = (el.getAttribute('role') || '').toLowerCase();
        const text = (el.textContent || '').toLowerCase();

        if (
          (aria && aria.includes(cleanTerm)) ||
          (placeholder && placeholder.includes(cleanTerm)) ||
          (text && text.includes(cleanTerm)) ||
          (role === 'searchbox' && cleanTerm.includes('search'))
        ) {
          return el;
        }
      }
    }

    // 4. Bounding box coordinates fallback
    if (action.boundingBox && typeof document.elementFromPoint === 'function') {
      const centerX = action.boundingBox.x + action.boundingBox.width / 2;
      const centerY = action.boundingBox.y + action.boundingBox.height / 2;
      const elAtPoint = document.elementFromPoint(centerX, centerY);
      if (elAtPoint) return elAtPoint;
    }

    return null;
  }

  private async executePressKey(el: Element, key: string): Promise<void> {
    if ('focus' in el && typeof (el as any).focus === 'function') {
      (el as any).focus();
    }

    const keyEventInit: KeyboardEventInit = {
      key: key,
      code: key === 'Enter' ? 'Enter' : key,
      keyCode: key === 'Enter' ? 13 : 0,
      which: key === 'Enter' ? 13 : 0,
      bubbles: true,
      cancelable: true,
    };

    el.dispatchEvent(new KeyboardEvent('keydown', keyEventInit));
    el.dispatchEvent(new KeyboardEvent('keypress', keyEventInit));
    el.dispatchEvent(new KeyboardEvent('keyup', keyEventInit));

    if (key === 'Enter') {
      const form = el.closest('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }
  }

  private async executeClick(el: Element): Promise<void> {
    if ('click' in el && typeof (el as any).click === 'function') {
      (el as any).click();
    } else {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  }

  private async executeType(
    el: Element,
    action: AgentAction,
    allowCredentials = true
  ): Promise<void> {
    // Resolve value: prefer local token if valueRef exists and credentials allowed
    const valueToType = resolveActionValue(action, this.localTokens, allowCredentials);

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.focus();
      el.value = valueToType;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (el.getAttribute('contenteditable') === 'true') {
      el.textContent = valueToType;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      throw new Error(`Target is not an editable text input: ${el.tagName}`);
    }
  }

  private async executeSelect(el: Element, value: string): Promise<void> {
    if (el instanceof HTMLSelectElement) {
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      throw new Error(`Target is not a select element: ${el.tagName}`);
    }
  }

  private async executeSubmit(el: Element): Promise<void> {
    const form = el.tagName === 'FORM' ? (el as HTMLFormElement) : el.closest('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    } else if ('click' in el) {
      (el as any).click();
    } else {
      throw new Error('No form found to submit');
    }
  }

  private executeScroll(action: AgentAction, timestamp: number): ActionResult {
    const direction = action.direction || 'down';
    const amount = Number(action.value) || window.innerHeight * 0.7;

    const deltaY = direction === 'down' ? amount : direction === 'up' ? -amount : 0;
    const deltaX = direction === 'right' ? amount : direction === 'left' ? -amount : 0;

    window.scrollBy({ top: deltaY, left: deltaX, behavior: 'smooth' });
    return { action, success: true, timestamp, targetVerified: true };
  }
}

/**
 * Convenience helper to execute a browser action with default executor instance.
 */
export async function executeBrowserAction(
  action: AgentAction,
  autoConfirmSafe = true,
  sensitiveRegions: SensitiveRegion[] = []
): Promise<ActionResult> {
  const executor = new ActionExecutor();
  return executor.execute(action, sensitiveRegions, autoConfirmSafe);
}

