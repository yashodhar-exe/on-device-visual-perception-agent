/**
 * networkGuard.ts
 *
 * STEP 10 — Network Guardian
 *
 * Intercepts outgoing fetch/XHR requests from the page, checks if the
 * payload contains raw sensitive values, and blocks/sanitizes before
 * the request leaves the browser.
 *
 * Two-layer protection:
 *  1. Request interception (content script injects into page context)
 *  2. declarativeNetRequest rules (background) for known LLM API endpoints
 */

import { DetectedItem } from '../core/types';
import { sanitizeObject, validatePayloadIsSafe } from '../sanitization/sanitizer';

// ─── Intercept fetch ──────────────────────────────────────────────────────────

export function installNetworkGuard(getItems: () => DetectedItem[]) {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const items = getItems();
    if (items.length === 0) return originalFetch(input, init);

    if (init?.body && typeof init.body === 'string') {
      try {
        const parsed = JSON.parse(init.body);
        const { safe, violations } = validatePayloadIsSafe(parsed, items);

        if (!safe) {
          console.warn('[PrivacyFirewall] Unsafe fetch payload detected:', violations);

          const sanitized = sanitizeObject(parsed, items);
          init = { ...init, body: JSON.stringify(sanitized) };

          // Notify extension
          chrome.runtime.sendMessage({
            type: 'BLOCK_REQUEST',
            payload: { url: input.toString(), violations },
          });
        }
      } catch {
        // Non-JSON body — skip
      }
    }

    return originalFetch(input, init);
  };
}

// ─── Intercept XHR ───────────────────────────────────────────────────────────

export function installXhrGuard(getItems: () => DetectedItem[]) {
  const OriginalXHR = window.XMLHttpRequest;

  class GuardedXHR extends OriginalXHR {
    send(body?: Document | XMLHttpRequestBodyInit | null) {
      const items = getItems();
      if (body && typeof body === 'string' && items.length > 0) {
        try {
          const parsed = JSON.parse(body);
          const { safe, violations } = validatePayloadIsSafe(parsed, items);

          if (!safe) {
            console.warn('[PrivacyFirewall] Unsafe XHR payload:', violations);
            const sanitized = sanitizeObject(parsed, items);
            body = JSON.stringify(sanitized);

            chrome.runtime.sendMessage({
              type: 'BLOCK_REQUEST',
              payload: { url: this.responseURL, violations },
            });
          }
        } catch {
          // Non-JSON — skip
        }
      }
      super.send(body);
    }
  }

  window.XMLHttpRequest = GuardedXHR;
}

// ─── Known LLM API endpoint patterns ─────────────────────────────────────────

export const SENSITIVE_ENDPOINTS = [
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.mistral.ai',
  'api.cohere.com',
  'api.groq.com',
  'api.together.xyz',
];
