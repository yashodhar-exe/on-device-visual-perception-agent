/**
 * domScanner.ts
 *
 * STEP 1 & 2 — Scan every input, textarea, editable div and visible text node.
 * Returns raw DOM node info ready for the detector pipeline.
 */

import { BoundingBox, LocationInfo } from '../core/types';

export interface DomNode {
  element: Element;
  text: string;
  location: LocationInfo;
  isInput: boolean;
  inputType?: string;
}

// ─── Get CSS selector for an element ─────────────────────────────────────────

export function getCssSelector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.body) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      part = `#${CSS.escape(current.id)}`;
      parts.unshift(part);
      break;
    }
    const siblings = Array.from(current.parentElement?.children ?? []).filter(
      (c) => c.tagName === current!.tagName
    );
    if (siblings.length > 1) {
      const idx = siblings.indexOf(current) + 1;
      part += `:nth-of-type(${idx})`;
    }
    parts.unshift(part);
    current = current.parentElement;
  }
  return parts.join(' > ');
}

// ─── Get XPath for an element ─────────────────────────────────────────────────

export function getXPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let idx = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) idx++;
      sibling = sibling.previousElementSibling;
    }
    const tag = current.tagName.toLowerCase();
    parts.unshift(idx > 1 ? `${tag}[${idx}]` : tag);
    current = current.parentElement;
  }
  return '/' + parts.join('/');
}

// ─── Get bounding box relative to viewport (same origin as screenshot) ───────

export function getElementBoundingBox(el: Element): BoundingBox {
  const rect = el.getBoundingClientRect();
  return {
    x: Math.round(rect.left + window.scrollX),
    y: Math.round(rect.top + window.scrollY),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

// ─── Build LocationInfo for an element ───────────────────────────────────────

export function buildLocationInfo(el: Element, label?: string): LocationInfo {
  const boundingBox = getElementBoundingBox(el);
  return {
    boundingBox,
    selector: getCssSelector(el),
    xpath: getXPath(el),
    cssPath: getCssSelector(el),
    pageLabel: label ?? inferPageLabel(el),
  };
}

// ─── Infer human-readable label from context ─────────────────────────────────

export function inferPageLabel(el: Element): string {
  // Try associated <label>
  const id = el.getAttribute('id');
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent) return label.textContent.trim();
  }
  // Try aria-label
  const aria = el.getAttribute('aria-label') ?? el.getAttribute('placeholder');
  if (aria) return aria;
  // Try nearest heading
  let p = el.parentElement;
  for (let i = 0; i < 5 && p; i++, p = p.parentElement) {
    const heading = p.querySelector('h1, h2, h3, h4, legend, [role=heading]');
    if (heading?.textContent) return heading.textContent.trim().slice(0, 40);
    const form = p.closest('form');
    if (form) {
      const formLabel = form.getAttribute('aria-label') ?? form.id;
      if (formLabel) return formLabel;
    }
  }
  return document.title.slice(0, 40) || 'Page';
}

// ─── Collect all scannable DOM nodes ─────────────────────────────────────────

export function collectDomNodes(): DomNode[] {
  const nodes: DomNode[] = [];

  // 1. Input fields
  document
    .querySelectorAll<HTMLInputElement>('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]):not([type=checkbox]):not([type=radio])')
    .forEach((el) => {
      if (!isVisible(el)) return;
      nodes.push({
        element: el,
        text: el.value ?? '',
        location: buildLocationInfo(el),
        isInput: true,
        inputType: el.type,
      });
    });

  // 2. Textareas
  document.querySelectorAll<HTMLTextAreaElement>('textarea').forEach((el) => {
    if (!isVisible(el)) return;
    nodes.push({
      element: el,
      text: el.value ?? '',
      location: buildLocationInfo(el),
      isInput: true,
      inputType: 'textarea',
    });
  });

  // 3. Contenteditable divs
  document
    .querySelectorAll<HTMLElement>('[contenteditable="true"], [contenteditable=""]')
    .forEach((el) => {
      if (!isVisible(el)) return;
      nodes.push({
        element: el,
        text: el.innerText ?? '',
        location: buildLocationInfo(el),
        isInput: true,
        inputType: 'contenteditable',
      });
    });

  // 4. Visible text nodes (code blocks, pre, spans, divs, p)
  const textSelectors = 'code, pre, p, span, div, td, li, h1, h2, h3, h4, h5, h6, a, label, blockquote';
  document.querySelectorAll<HTMLElement>(textSelectors).forEach((el) => {
    if (!isVisible(el)) return;
    // Only leaf-ish elements with direct text
    const text = getDirectText(el);
    if (text.length < 6) return;
    nodes.push({
      element: el,
      text,
      location: buildLocationInfo(el),
      isInput: false,
    });
  });

  return nodes;
}

// ─── Only get direct text content (exclude nested element text) ──────────────

function getDirectText(el: HTMLElement): string {
  let text = '';
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
    }
  });
  return text.trim();
}

// ─── Visibility check ─────────────────────────────────────────────────────────

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if ((style.opacity ?? '1') === '0') return false;
  return true;
}
