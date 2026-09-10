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
import { defaultAttachmentInterceptor } from '../visualPrivacy';

// ─── Intercept fetch ──────────────────────────────────────────────────────────

export function installNetworkGuard(getItems: () => DetectedItem[]) {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    // 1. Guard against transmitting raw original image files
    if (init?.body) {
      if (typeof File !== 'undefined' && init.body instanceof File) {
        const replacement = defaultAttachmentInterceptor.getSanitizedReplacement(init.body);
        if (replacement) {
          init = { ...init, body: replacement };
        }
      } else if (typeof FormData !== 'undefined' && init.body instanceof FormData) {
        const newFormData = new FormData();
        let modified = false;
        for (const [key, val] of (init.body as any).entries()) {
          if (val && typeof val === 'object' && val instanceof Blob) {
            const replacement = defaultAttachmentInterceptor.getSanitizedReplacement(val);
            if (replacement) {
              newFormData.append(key, replacement, (replacement as any).name || (val as any).name);
              modified = true;
              continue;
            }
          }
          newFormData.append(key, val);
        }
        if (modified) {
          init = { ...init, body: newFormData };
        }
      }
    }

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
          try {
            chrome.runtime.sendMessage({
              type: 'BLOCK_REQUEST',
              payload: { url: input.toString(), violations },
            });
          } catch {}
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
      if (body) {
        if (typeof File !== 'undefined' && body instanceof File) {
          const replacement = defaultAttachmentInterceptor.getSanitizedReplacement(body);
          if (replacement) {
            body = replacement;
          }
        } else if (typeof FormData !== 'undefined' && body instanceof FormData) {
          const newFormData = new FormData();
          let modified = false;
          for (const [key, val] of (body as any).entries()) {
            if (val && typeof val === 'object' && val instanceof Blob) {
              const replacement = defaultAttachmentInterceptor.getSanitizedReplacement(val);
              if (replacement) {
                newFormData.append(key, replacement, (replacement as any).name || (val as any).name);
                modified = true;
                continue;
              }
            }
            newFormData.append(key, val);
          }
          if (modified) {
            body = newFormData;
          }
        }
      }

      const items = getItems();
      if (body && typeof body === 'string' && items.length > 0) {
        try {
          const parsed = JSON.parse(body);
          const { safe, violations } = validatePayloadIsSafe(parsed, items);

          if (!safe) {
            console.warn('[PrivacyFirewall] Unsafe XHR payload:', violations);
            const sanitized = sanitizeObject(parsed, items);
            body = JSON.stringify(sanitized);

            try {
              chrome.runtime.sendMessage({
                type: 'BLOCK_REQUEST',
                payload: { url: this.responseURL, violations },
              });
            } catch {}
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
