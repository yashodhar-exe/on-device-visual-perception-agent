/**
 * confirmationHook.ts
 *
 * In-DOM User Action Confirmation System.
 * Injects a floating high-contrast confirmation banner for sensitive actions:
 *  - Form submissions
 *  - Password interactions
 *  - Payment or financial actions
 *  - Destructive changes
 *
 * User must explicitly click "Allow" or "Deny". Times out after 10s (denies by default).
 */

import { AgentAction, SensitiveRegion } from '../core/types';

const BANNER_ID = 'pf-agent-confirmation-toast';

/**
 * Checks if an action requires user authorization prior to execution.
 * Follows strict SIH security tiers:
 * - submit actions
 * - password / authentication inputs
 * - payment / credit card / banking inputs
 * - destructive actions
 * - targets overlapping sensitive regions
 */
export function shouldRequireConfirmation(
  action: AgentAction,
  sensitiveRegions: SensitiveRegion[] = []
): boolean {
  if (action.requiresConfirmation) return true;
  if (action.action === 'submit') return true;

  const selector = (action.selector || '').toLowerCase();
  const valueRef = (action.valueRef || '').toUpperCase();

  if (
    /password|pwd|pass|pin|auth|credential|login|signin/i.test(selector) ||
    valueRef.includes('PASSWORD') ||
    valueRef.includes('PIN')
  ) {
    return true;
  }

  if (/pay|card|cvv|expiry|bank|account|checkout|billing|aadhaar|pan/i.test(selector)) {
    return true;
  }

  if (/delete|destroy|remove|clear|reset|cancel/i.test(selector)) {
    return true;
  }

  // Check if target element intersects any sensitive region in DOM
  if (action.selector && sensitiveRegions.length > 0 && typeof document !== 'undefined') {
    try {
      const el = document.querySelector(action.selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        for (const reg of sensitiveRegions) {
          const r = reg.boundingBox;
          if (
            rect.left < r.x + r.width &&
            rect.right > r.x &&
            rect.top < r.y + r.height &&
            rect.bottom > r.y
          ) {
            return true;
          }
        }
      }
    } catch {
      // Handled by validator
    }
  }

  return false;
}


export async function requestUserConfirmation(action: AgentAction): Promise<boolean> {
  if (typeof document === 'undefined') {
    return false;
  }

  // Remove existing banner if present
  const existing = document.getElementById(BANNER_ID);
  if (existing) existing.remove();

  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.id = BANNER_ID;
    container.setAttribute('role', 'alertdialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-label', 'Agent Action Authorization');

    Object.assign(container.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '380px',
      maxWidth: 'calc(100vw - 48px)',
      background: '#0F172A',
      color: '#F8FAFC',
      border: '2px solid #F59E0B',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    });

    const titleEl = document.createElement('div');
    titleEl.style.display = 'flex';
    titleEl.style.alignItems = 'center';
    titleEl.style.gap = '8px';
    titleEl.style.fontWeight = '700';
    titleEl.style.color = '#F59E0B';
    titleEl.innerHTML = `
      <span style="font-size:16px;">⚠️</span>
      <span>Agent Action Confirmation Required</span>
    `;

    const descEl = document.createElement('div');
    descEl.style.color = '#E2E8F0';
    descEl.style.lineHeight = '1.4';
    descEl.innerHTML = `
      The Vision Agent requests permission to perform:
      <div style="margin-top:6px; background:#1E293B; padding:8px; border-radius:6px; font-family:monospace; font-size:12px;">
        <strong>Action:</strong> ${action.action.toUpperCase()}<br/>
        <strong>Target:</strong> ${action.selector || 'window'}<br/>
        ${action.valueRef ? `<strong>Credential Ref:</strong> ${action.valueRef}<br/>` : ''}
        ${action.reason ? `<strong>Reason:</strong> ${action.reason}` : ''}
      </div>
    `;

    const buttonGroup = document.createElement('div');
    buttonGroup.style.display = 'flex';
    buttonGroup.style.gap = '8px';
    buttonGroup.style.justifyContent = 'flex-end';
    buttonGroup.style.marginTop = '4px';

    const denyBtn = document.createElement('button');
    denyBtn.textContent = 'Deny Action';
    Object.assign(denyBtn.style, {
      background: '#334155',
      color: '#F8FAFC',
      border: 'none',
      padding: '8px 14px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '600',
    });

    const allowBtn = document.createElement('button');
    allowBtn.textContent = 'Authorize Action';
    Object.assign(allowBtn.style, {
      background: '#10B981',
      color: '#064E3B',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '700',
    });

    let settled = false;

    function cleanup(decision: boolean) {
      if (!settled) {
        settled = true;
        container.remove();
        resolve(decision);
      }
    }

    denyBtn.onclick = () => cleanup(false);
    allowBtn.onclick = () => cleanup(true);

    buttonGroup.appendChild(denyBtn);
    buttonGroup.appendChild(allowBtn);

    container.appendChild(titleEl);
    container.appendChild(descEl);
    container.appendChild(buttonGroup);

    document.body.appendChild(container);

    // Auto-deny timeout after 12 seconds for safety
    setTimeout(() => cleanup(false), 12000);
  });
}
