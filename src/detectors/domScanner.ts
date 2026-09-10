/**
 * domScanner.ts
 *
 * Scans input, textarea, editable elements, shadow DOM roots, and visible text nodes.
 * Ignores text inside navigation menus, sidebars, breadcrumbs, page titles,
 * buttons, links, logos, labels, and Google sign-in chips.
 * Builds complete LocationInfo (selector, xpath, cssPath, boundingBox, pageRegion) for every node.
 */

import { BoundingBox, LocationInfo, ContentProvenance } from '../core/types';
import { determineElementProvenance } from '../provenance/contentProvenance';

export interface DomNode {
  element: Element;
  text: string;
  location: LocationInfo;
  isInput: boolean;
  inputType?: string;
  provenance?: ContentProvenance;
}

// ─── Node content caching to avoid rescanning unchanged nodes ────────────────

const nodeCache = new WeakMap<Element, string>();

// ─── Selector for UI Regions / Containers to Ignore ───────────────────────────

export const IGNORED_CONTAINERS_SELECTOR = [
  'nav',
  'header',
  'footer',
  'aside',
  '[role="navigation"]',
  '[role="complementary"]',
  '[role="button"]',
  '[role="link"]',
  '.nav',
  '.navbar',
  '.header',
  '.sidebar',
  '.breadcrumb',
  '.logo',
  '#logo',
  '.history',
  '#history',
  '.chat-history',
  '[data-testid*="history" i]',
  '[class*="history" i]',
  '[aria-label*="history" i]',
  '[aria-label*="breadcrumb" i]',
  '[aria-label*="logo" i]',
  'title',
  'h1',
  '.title',
  '.page-title',
  'button',
  'a',
  'label',
  '.gsi-material-button',
  '[class*="gsi" i]',
  '[id*="gsi" i]',
  '[aria-label*="Sign in with Google" i]',
].join(', ');

export function isInsideIgnoredContainer(el: Element): boolean {
  if (!el || !el.closest) return false;
  return el.closest(IGNORED_CONTAINERS_SELECTOR) !== null;
}

function safeCssEscape(str: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(str);
  }
  return str.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

// ─── Get CSS selector for an element ─────────────────────────────────────────

export function getCssSelector(el: Element): string {
  if (!el) return 'body';
  if (el.id) return `#${safeCssEscape(el.id)}`;
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.body && current !== document.documentElement) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      part = `#${safeCssEscape(current.id)}`;
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
  return parts.join(' > ') || 'body';
}

// ─── Get XPath for an element ─────────────────────────────────────────────────

export function getXPath(el: Element): string {
  if (!el) return '/html/body';
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

// ─── Get bounding box relative to document scroll & zoom ──────────────────────

export function getElementBoundingBox(el: Element): BoundingBox {
  if (!el || typeof el.getBoundingClientRect !== 'function') {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const rect = el.getBoundingClientRect();
  const scrollX = typeof window !== 'undefined' ? (window.scrollX || window.pageXOffset || 0) : 0;
  const scrollY = typeof window !== 'undefined' ? (window.scrollY || window.pageYOffset || 0) : 0;
  return {
    x: Math.round(rect.left + scrollX),
    y: Math.round(rect.top + scrollY),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

// ─── Infer human-readable Page Region / Label ─────────────────────────────────

export function inferPageLabel(el: Element): string {
  if (!el) return 'Main Content';

  // Try associated <label>
  const id = el.getAttribute('id');
  if (id && typeof document !== 'undefined') {
    const label = document.querySelector(`label[for="${safeCssEscape(id)}"]`);
    if (label?.textContent) return label.textContent.trim().slice(0, 40);
  }

  // Try aria-label / placeholder
  const aria = el.getAttribute('aria-label') ?? el.getAttribute('placeholder');
  if (aria) return aria.trim().slice(0, 40);

  // Try nearest section / heading / form
  let p = el.parentElement;
  for (let i = 0; i < 5 && p; i++, p = p.parentElement) {
    const form = p.closest('form');
    if (form) {
      const formLabel = form.getAttribute('aria-label') ?? form.id;
      if (formLabel) return formLabel;
      return 'Form Input';
    }
    const heading = p.querySelector('h1, h2, h3, h4, legend, [role=heading]');
    if (heading?.textContent) return heading.textContent.trim().slice(0, 40);
  }

  if (el.tagName === 'TEXTAREA') return 'Textarea';
  if (el.tagName === 'INPUT') return 'Input Field';
  if (el.classList.contains('code-block') || el.tagName === 'CODE' || el.tagName === 'PRE') return 'Code Block';

  return typeof document !== 'undefined' && document.title ? document.title.slice(0, 40) : 'Main Content';
}

// ─── Build Complete LocationInfo for an Element ───────────────────────────────

export function buildLocationInfo(el: Element, label?: string): LocationInfo {
  const selector = getCssSelector(el);
  const xpath = getXPath(el);
  const boundingBox = getElementBoundingBox(el);

  return {
    boundingBox,
    selector,
    xpath,
    cssPath: selector,
    pageLabel: label ?? inferPageLabel(el),
  };
}

// ─── Check if element is visible and enabled ──────────────────────────────────

export function isVisibleAndEnabled(el: Element): boolean {
  if (!el) return false;
  if (typeof window === 'undefined') return true;

  // Disabled or aria-disabled check
  if ((el as HTMLInputElement).disabled || el.getAttribute('aria-disabled') === 'true') {
    return false;
  }

  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

  if (typeof el.getBoundingClientRect === 'function') {
    const rect = el.getBoundingClientRect();
    if (!isTest && rect.width === 0 && rect.height === 0) {
      return false;
    }
  }

  if (typeof window.getComputedStyle === 'function') {
    try {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || (style.opacity ?? '1') === '0') {
        return false;
      }
    } catch {
      // Best effort
    }
  }
  return true;
}

// ─── Shadow DOM Query Helper ──────────────────────────────────────────────────

export function queryAllDeep(selector: string, root: ParentNode = document): Element[] {
  const elements: Element[] = Array.from(root.querySelectorAll(selector));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  let node = walker.nextNode() as Element | null;
  while (node) {
    if (node.shadowRoot) {
      elements.push(...queryAllDeep(selector, node.shadowRoot));
    }
    node = walker.nextNode() as Element | null;
  }
  return elements;
}

// ─── Collect Scannable DOM Nodes ──────────────────────────────────────────────

export function collectDomNodes(): DomNode[] {
  if (typeof document === 'undefined') return [];
  const nodes: DomNode[] = [];
  const seen = new Set<Element>();

  // 1. Input fields (excluding hidden, buttons, submit, checkbox, radio)
  const inputSelector =
    'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]):not([type=checkbox]):not([type=radio])';

  queryAllDeep(inputSelector).forEach((el) => {
    if (seen.has(el) || !isVisibleAndEnabled(el)) return;
    seen.add(el);

    const input = el as HTMLInputElement;
    const text = input.value ?? '';
    const cachedText = nodeCache.get(el);

    // Skip if cached and unchanged
    if (cachedText !== undefined && cachedText === text && input.type !== 'password') {
      return;
    }
    nodeCache.set(el, text);

    nodes.push({
      element: el,
      text,
      location: buildLocationInfo(el),
      isInput: true,
      inputType: input.type,
      provenance: determineElementProvenance(el),
    });
  });

  // 2. Textareas
  queryAllDeep('textarea').forEach((el) => {
    if (seen.has(el) || !isVisibleAndEnabled(el)) return;
    seen.add(el);

    const textarea = el as HTMLTextAreaElement;
    const text = textarea.value ?? '';
    const cachedText = nodeCache.get(el);

    if (cachedText !== undefined && cachedText === text) return;
    nodeCache.set(el, text);

    nodes.push({
      element: el,
      text,
      location: buildLocationInfo(el),
      isInput: true,
      inputType: 'textarea',
      provenance: determineElementProvenance(el),
    });
  });

  // 3. Contenteditable elements
  queryAllDeep('[contenteditable="true"], [contenteditable=""]').forEach((el) => {
    if (seen.has(el) || !isVisibleAndEnabled(el)) return;
    seen.add(el);

    const text = (el as HTMLElement).innerText ?? '';
    const cachedText = nodeCache.get(el);

    if (cachedText !== undefined && cachedText === text) return;
    nodeCache.set(el, text);

    nodes.push({
      element: el,
      text,
      location: buildLocationInfo(el),
      isInput: true,
      inputType: 'contenteditable',
      provenance: determineElementProvenance(el),
    });
  });

  // 4. Visible text nodes — EXCLUDING ignored containers, buttons, and labels
  const textSelectors = 'code, pre, p, span, div, td, li, blockquote';
  queryAllDeep(textSelectors).forEach((el) => {
    if (seen.has(el) || !isVisibleAndEnabled(el)) return;
    if (isInsideIgnoredContainer(el)) return;

    const htmlEl = el as HTMLElement;
    const text = getDirectText(htmlEl);
    if (text.length < 6) return;

    const cachedText = nodeCache.get(el);
    if (cachedText !== undefined && cachedText === text) return;
    nodeCache.set(el, text);

    seen.add(el);
    nodes.push({
      element: el,
      text,
      location: buildLocationInfo(el),
      isInput: false,
      provenance: determineElementProvenance(el),
    });
  });

  return nodes;
}

// ─── Collect DOM Nodes in Specific Roots (Incremental Scan) ────────────────────

export function collectDomNodesInRoots(roots: Element[]): DomNode[] {
  if (typeof document === 'undefined') return [];
  const nodes: DomNode[] = [];
  const seen = new Set<Element>();

  for (const root of roots) {
    if (!root) continue;

    const inputSelector =
      'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]):not([type=checkbox]):not([type=radio])';

    queryAllDeep(inputSelector, root).forEach((el) => {
      if (seen.has(el) || !isVisibleAndEnabled(el)) return;
      seen.add(el);

      const input = el as HTMLInputElement;
      nodes.push({
        element: el,
        text: input.value ?? '',
        location: buildLocationInfo(el),
        isInput: true,
        inputType: input.type,
        provenance: determineElementProvenance(el),
      });
    });

    queryAllDeep('textarea', root).forEach((el) => {
      if (seen.has(el) || !isVisibleAndEnabled(el)) return;
      seen.add(el);

      const textarea = el as HTMLTextAreaElement;
      nodes.push({
        element: el,
        text: textarea.value ?? '',
        location: buildLocationInfo(el),
        isInput: true,
        inputType: 'textarea',
        provenance: determineElementProvenance(el),
      });
    });

    queryAllDeep('[contenteditable="true"], [contenteditable=""]', root).forEach((el) => {
      if (seen.has(el) || !isVisibleAndEnabled(el)) return;
      seen.add(el);

      nodes.push({
        element: el,
        text: (el as HTMLElement).innerText ?? '',
        location: buildLocationInfo(el),
        isInput: true,
        inputType: 'contenteditable',
        provenance: determineElementProvenance(el),
      });
    });

    const textSelectors = 'code, pre, p, span, div, td, li, blockquote';
    queryAllDeep(textSelectors, root).forEach((el) => {
      if (seen.has(el) || !isVisibleAndEnabled(el)) return;
      if (isInsideIgnoredContainer(el)) return;

      const text = getDirectText(el as HTMLElement);
      if (text.length < 6) return;

      seen.add(el);
      nodes.push({
        element: el,
        text,
        location: buildLocationInfo(el),
        isInput: false,
        provenance: determineElementProvenance(el),
      });
    });
  }

  return nodes;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDirectText(el: HTMLElement): string {
  if (el.tagName === 'CODE' || el.tagName === 'PRE') {
    return el.textContent?.trim() ?? '';
  }
  let text = '';
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
    }
  });
  return text.trim() || (el.children.length === 0 ? el.textContent?.trim() ?? '' : '');
}

/**
 * Resolves the precise pixel bounding box of a matching text substring inside an element,
 * using document.createRange() across its text nodes.
 * Falls back to null if Range is unavailable or text is not found.
 */
export function getTextMatchBoundingBox(el: Element, textToFind: string): BoundingBox | null {
  if (typeof document === 'undefined' || !el || !textToFind) return null;
  try {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      const content = textNode.textContent || '';
      const idx = content.indexOf(textToFind);
      if (idx !== -1) {
        const range = document.createRange();
        range.setStart(textNode, idx);
        range.setEnd(textNode, idx + textToFind.length);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const scrollX = typeof window !== 'undefined' ? (window.scrollX || window.pageXOffset || 0) : 0;
          const scrollY = typeof window !== 'undefined' ? (window.scrollY || window.pageYOffset || 0) : 0;
          return {
            x: Math.round(rect.left + scrollX),
            y: Math.round(rect.top + scrollY),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        }
      }
      textNode = walker.nextNode();
    }
  } catch {
    // Range API might throw in simulated test environments without layout
  }
  return null;
}

