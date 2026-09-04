/**
 * overlay.ts
 *
 * STEP 7 — Draw colored overlays around detected sensitive items.
 * STEP 8 — Replace visible values with placeholders locally.
 *
 * All changes are non-destructive:
 *  - Overlays are appended to a shadow-DOM container
 *  - Input values are temporarily replaced (originals stored in WeakMap)
 */

import { DetectedItem, OVERLAY_COLORS, OVERLAY_BORDER_COLORS } from '../core/types';

const CONTAINER_ID = '__pf_overlay_root__';
const LABEL_CLASS = '__pf_overlay_label__';

// Store original values so we can restore
const originalValues = new Map<HTMLInputElement | HTMLTextAreaElement | HTMLElement, string>();

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

function drawOverlay(item: DetectedItem, container: HTMLElement) {
  const { x, y, width, height } = item.location.boundingBox;

  const div = document.createElement('div');
  div.dataset.pfId = item.id;
  div.dataset.pfType = item.type;
  div.style.cssText = `
    position: absolute;
    left: ${x - window.scrollX}px;
    top: ${y - window.scrollY}px;
    width: ${width}px;
    height: ${height}px;
    background: ${OVERLAY_COLORS[item.type]};
    border: 2px solid ${OVERLAY_BORDER_COLORS[item.type]};
    border-radius: 3px;
    box-sizing: border-box;
    pointer-events: none;
  `;

  // Label badge
  const label = document.createElement('div');
  label.className = LABEL_CLASS;
  label.textContent = item.type.replace(/_/g, ' ');
  label.style.cssText = `
    position: absolute;
    top: -18px;
    left: 0;
    background: ${OVERLAY_BORDER_COLORS[item.type]};
    color: #ffffff;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.05em;
    padding: 1px 5px;
    border-radius: 2px;
    white-space: nowrap;
    pointer-events: none;
    line-height: 16px;
  `;

  div.appendChild(label);
  container.appendChild(div);
}

// ─── Render all overlays ─────────────────────────────────────────────────────

export function renderOverlays(items: DetectedItem[]) {
  const container = getOrCreateContainer();
  // Remove existing overlays
  Array.from(container.children).forEach((c) => c.remove());

  for (const item of items) {
    if (item.location.boundingBox.width > 0 && item.location.boundingBox.height > 0) {
      drawOverlay(item, container);
    }
  }
}

// ─── Clear all overlays ──────────────────────────────────────────────────────

export function clearOverlays() {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    Array.from(container.children).forEach((c) => c.remove());
  }
}

// ─── Redact input values with placeholders ────────────────────────────────────

export function redactItems(items: DetectedItem[]) {
  for (const item of items) {
    if (!item.location.selector) continue;

    try {
      const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLElement>(
        item.location.selector
      );
      if (!el) continue;

      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (!originalValues.has(el)) {
          originalValues.set(el, el.value);
        }
        if (item.type === 'PASSWORD') return; // Don't overwrite password fields
        el.value = item.placeholder;
        item.status = 'redacted';
      } else if ((el as HTMLElement).isContentEditable) {
        if (!originalValues.has(el)) {
          originalValues.set(el, (el as HTMLElement).innerText);
        }
        (el as HTMLElement).innerText = item.placeholder;
        item.status = 'redacted';
      }
    } catch {
      // Selector mismatch — skip
    }
  }
}

// ─── Restore original values ─────────────────────────────────────────────────

export function restoreOriginalValues() {
  originalValues.forEach((value, el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.value = value;
    } else if ((el as HTMLElement).isContentEditable) {
      (el as HTMLElement).innerText = value;
    }
  });
  originalValues.clear();
}

// ─── Update overlay positions on scroll/resize ───────────────────────────────

export function updateOverlayPositions(items: DetectedItem[]) {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  Array.from(container.children).forEach((child) => {
    const div = child as HTMLDivElement;
    const id = div.dataset.pfId;
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const { x, y } = item.location.boundingBox;
    div.style.left = `${x - window.scrollX}px`;
    div.style.top = `${y - window.scrollY}px`;
  });
}
