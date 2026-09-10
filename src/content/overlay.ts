/**
 * overlay.ts
 *
 * Draw colored overlays around detected sensitive items.
 * Replace visible values with placeholders locally.
 *
 * All changes are non-destructive:
 *  - Overlays are appended to a shadow-DOM container
 *  - Input values are temporarily replaced (originals stored in WeakMap)
 *  - Support viewport bounds checking, zoom levels (80-200%), and scroll offsets
 */

import { DetectedItem, OVERLAY_COLORS, OVERLAY_BORDER_COLORS } from '../core/types';
import { sanitizeContextString } from '../sanitization/semanticPlaceholder';

const CONTAINER_ID = '__pf_overlay_root__';
const LABEL_CLASS = '__pf_overlay_label__';

// Store original values so we can restore them cleanly
const originalValues = new Map<HTMLInputElement | HTMLTextAreaElement | HTMLElement, string>();

let isRedacting = false;
export function isCurrentlyRedacting(): boolean {
  return isRedacting;
}

// ─── Initialize overlay container ────────────────────────────────────────────

function getOrCreateContainer(): HTMLElement {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      pointer-events: none;
      z-index: 2147483647;
    `;
    document.documentElement.appendChild(container);
  }
  return container;
}

// ─── Draw a single overlay box ────────────────────────────────────────────────

function drawOverlay(item: DetectedItem, container: HTMLElement, stackIndex = 0) {
  const { x, y, width, height } = item.location.boundingBox;

  const currentScrollX = typeof window !== 'undefined' ? (window.scrollX || window.pageXOffset || 0) : 0;
  const currentScrollY = typeof window !== 'undefined' ? (window.scrollY || window.pageYOffset || 0) : 0;

  const leftPos = x - currentScrollX;
  const topPos = y - currentScrollY;

  // Viewport safety check for label badge positioning
  // If placing above input (topPos - 20) overflows top viewport (< 0), place inside input or below
  let labelTopCss = `top: ${-20 - stackIndex * 18}px;`;
  if (topPos - 20 < 0) {
    labelTopCss = height > 24 ? `top: ${2 + stackIndex * 18}px;` : `top: ${height + 2 + stackIndex * 18}px;`;
  }

  const div = document.createElement('div');
  div.dataset.pfId = item.id;
  div.dataset.pfType = item.type;
  div.style.cssText = `
    position: absolute;
    left: ${leftPos}px;
    top: ${topPos}px;
    width: ${Math.max(width, 10)}px;
    height: ${Math.max(height, 10)}px;
    background: ${OVERLAY_COLORS[item.type] || 'rgba(239, 68, 68, 0.15)'};
    border: 2px solid ${OVERLAY_BORDER_COLORS[item.type] || '#EF4444'};
    border-radius: 4px;
    box-sizing: border-box;
    pointer-events: none;
    transition: left 0.1s ease, top 0.1s ease, width 0.1s ease, height 0.1s ease;
  `;

  // Label badge
  const label = document.createElement('div');
  label.className = LABEL_CLASS;
  label.textContent = item.semanticPlaceholder || item.placeholder || item.type.replace(/_/g, ' ');
  label.style.cssText = `
    position: absolute;
    ${labelTopCss}
    left: 0;
    max-width: 360px;
    overflow: hidden;
    text-overflow: ellipsis;
    background: ${OVERLAY_BORDER_COLORS[item.type] || '#EF4444'};
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 2px 6px;
    border-radius: 3px;
    white-space: nowrap;
    pointer-events: none;
    line-height: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  `;

  div.appendChild(label);
  container.appendChild(div);
}

import { determineElementProvenance } from '../provenance/contentProvenance';

// ─── Render all overlays ─────────────────────────────────────────────────────

export function renderOverlays(items: DetectedItem[]) {
  const container = getOrCreateContainer();
  // Clear existing overlays
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const posCounts = new Map<string, number>();

  for (const item of items) {
    // DIRECTIONAL BOUNDARY: WEBPAGE_CONTENT must remain exactly as rendered.
    // NEVER draw masks, overlays, or badges over webpage-owned output!
    if (item.provenance === 'WEBPAGE_CONTENT') {
      continue;
    }

    if (item.location.boundingBox.width > 0 && item.location.boundingBox.height > 0) {
      const posKey = `${Math.round(item.location.boundingBox.x / 10)}:${Math.round(item.location.boundingBox.y / 10)}`;
      const stackIndex = posCounts.get(posKey) ?? 0;
      posCounts.set(posKey, stackIndex + 1);
      drawOverlay(item, container, stackIndex);
    }
  }
}

// ─── Clear all overlays ──────────────────────────────────────────────────────

export function clearOverlays() {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }
}

function sanitizeElementText(
  text: string,
  secretValue: string,
  detectedType?: string,
  explicitVarName?: string
): string {
  if (!text || !secretValue) return text;
  if (!text.includes('\n')) {
    return sanitizeContextString(text, secretValue, detectedType, explicitVarName);
  }
  return text
    .split('\n')
    .map((line) => {
      if (line.includes(secretValue)) {
        return sanitizeContextString(line, secretValue, detectedType, explicitVarName);
      }
      return line;
    })
    .join('\n');
}

// ─── Redact input values with placeholders ────────────────────────────────────

export function redactItems(items: DetectedItem[]) {
  isRedacting = true;
  try {
    for (const item of items) {
      // DIRECTIONAL BOUNDARY: Only USER_INPUT is eligible for privacy sanitization.
      // WEBPAGE_CONTENT must NEVER be modified, masked, or replaced.
      if (item.provenance && item.provenance !== 'USER_INPUT') {
        continue;
      }
      if (!item.location.selector) continue;

      try {
        const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLElement>(
          item.location.selector
        );
        if (!el) continue;

        // Dynamic element-level provenance guard
        if (determineElementProvenance(el) !== 'USER_INPUT') {
          continue;
        }

        const semanticText = item.semanticPlaceholder || item.placeholder;

        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          if (!originalValues.has(el)) {
            originalValues.set(el, el.value);
          }
          if (item.type === 'PASSWORD') continue; // Do not overwrite password dots
          if (el.value && el.value.includes(item.value)) {
            el.value = sanitizeElementText(el.value, item.value, item.type, item.variableName);
          } else if (!el.value || el.value === item.value) {
            el.value = semanticText;
          }
          item.status = 'redacted';
        } else if ((el as HTMLElement).isContentEditable) {
          const currentText = (el as HTMLElement).innerText || el.textContent || '';
          if (!originalValues.has(el)) {
            originalValues.set(el, currentText);
          }
          if (currentText && currentText.includes(item.value)) {
            const sanitized = sanitizeElementText(currentText, item.value, item.type, item.variableName);
            (el as HTMLElement).innerText = sanitized;
            el.textContent = sanitized;
          } else if (!currentText || currentText === item.value) {
            (el as HTMLElement).innerText = semanticText;
            el.textContent = semanticText;
          }
          item.status = 'redacted';
        }
      } catch {
        // Selector mismatch — skip
      }
    }
  } finally {
    // Keep flag true slightly past microtasks to avoid catching our own redactions in MutationObserver
    setTimeout(() => {
      isRedacting = false;
    }, 200);
  }
}

// ─── Restore original values ─────────────────────────────────────────────────

export function restoreOriginalValues() {
  originalValues.forEach((value, el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.value = value;
    } else if (el instanceof HTMLElement) {
      el.innerText = value;
    }
  });
  originalValues.clear();
}

// ─── Update overlay positions on scroll/resize/zoom ──────────────────────────

export function updateOverlayPositions(items: DetectedItem[]) {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const currentScrollX = typeof window !== 'undefined' ? (window.scrollX || window.pageXOffset || 0) : 0;
  const currentScrollY = typeof window !== 'undefined' ? (window.scrollY || window.pageYOffset || 0) : 0;

  Array.from(container.children).forEach((child) => {
    const div = child as HTMLDivElement;
    const id = div.dataset.pfId;
    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Recalculate bounding box if element still exists in DOM
    if (item.location.selector) {
      try {
        const el = document.querySelector(item.location.selector);
        if (el && typeof el.getBoundingClientRect === 'function') {
          const rect = el.getBoundingClientRect();
          item.location.boundingBox = {
            x: Math.round(rect.left + currentScrollX),
            y: Math.round(rect.top + currentScrollY),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        }
      } catch {
        // Element may be removed
      }
    }

    const { x, y, width, height } = item.location.boundingBox;
    const leftPos = x - currentScrollX;
    const topPos = y - currentScrollY;

    div.style.left = `${leftPos}px`;
    div.style.top = `${topPos}px`;
    div.style.width = `${Math.max(width, 10)}px`;
    div.style.height = `${Math.max(height, 10)}px`;
  });
}
