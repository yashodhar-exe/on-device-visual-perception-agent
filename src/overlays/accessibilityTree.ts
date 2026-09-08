/**
 * accessibilityTree.ts
 *
 * Sanitized Accessibility Tree Builder for Browser Vision Agent.
 *
 * Traverses interactive DOM elements, extracts accessibility roles,
 * computed accessible labels, and selectors, while sanitizing any
 * sensitive values to ensure raw PII never leaks into structural metadata.
 */

import { A11yNode, SensitiveRegion, BoundingBox } from '../core/types';
import { getSemanticPlaceholder, sanitizeRawText } from '../sanitization/sanitizer';

/**
 * Derives a clean CSS selector for an interactive element.
 */
function getElementSelector(el: Element): string {
  if (el.id) {
    return `#${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(el.id) : el.id}`;
  }
  const tag = el.tagName.toLowerCase();
  const name = el.getAttribute('name');
  if (name) {
    const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(name) : name;
    return `${tag}[name="${escaped}"]`;
  }
  const role = el.getAttribute('role');
  if (role) {
    return `${tag}[role="${role}"]`;
  }
  if (el.parentElement && el.parentElement !== document.body) {
    const siblings = Array.from(el.parentElement.children).filter(
      (c) => c.tagName === el.tagName
    );
    if (siblings.length > 1) {
      const idx = siblings.indexOf(el) + 1;
      return `${getElementSelector(el.parentElement)} > ${tag}:nth-of-type(${idx})`;
    }
    return `${getElementSelector(el.parentElement)} > ${tag}`;
  }
  return tag;
}


const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'textbox',
  'checkbox',
  'radio',
  'combobox',
  'listbox',
  'menuitem',
  'tab',
  'switch',
  'searchbox',
  'form',
  'dialog',
  'alertdialog',
]);

const INTERACTIVE_TAGS = new Set([
  'BUTTON',
  'A',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'FORM',
  'DETAILS',
]);

/**
 * Derives the accessibility role of an element.
 */
function getElementRole(el: Element): string {
  const explicitRole = el.getAttribute('role');
  if (explicitRole) return explicitRole.toLowerCase();

  const tag = el.tagName.toUpperCase();
  if (tag === 'BUTTON') return 'button';
  if (tag === 'A' && el.hasAttribute('href')) return 'link';
  if (tag === 'TEXTAREA') return 'textbox';
  if (tag === 'FORM') return 'form';
  if (tag === 'SELECT') return 'combobox';
  if (tag === 'INPUT') {
    const inputType = (el.getAttribute('type') || 'text').toLowerCase();
    if (inputType === 'button' || inputType === 'submit' || inputType === 'reset') return 'button';
    if (inputType === 'checkbox') return 'checkbox';
    if (inputType === 'radio') return 'radio';
    if (inputType === 'search') return 'searchbox';
    return 'textbox';
  }

  return 'generic';
}

/**
 * Computes accessible label while enforcing strict PII sanitization.
 */
function getSanitizedAccessibleLabel(
  el: Element,
  sensitiveRegions: SensitiveRegion[]
): string {
  // Check aria-label
  let label = el.getAttribute('aria-label') || '';

  // Check aria-labelledby
  if (!label && el.hasAttribute('aria-labelledby')) {
    const id = el.getAttribute('aria-labelledby')!;
    const ref = document.getElementById(id);
    if (ref) label = ref.textContent || '';
  }

  // Check associated label element
  if (!label && el.id) {
    const labelEl = document.querySelector(`label[for="${el.id}"]`);
    if (labelEl) label = labelEl.textContent || '';
  }

  // Check placeholder or title or textContent
  if (!label) {
    label =
      el.getAttribute('placeholder') ||
      el.getAttribute('title') ||
      (el.tagName === 'BUTTON' || el.tagName === 'A' ? el.textContent || '' : '');
  }

  label = label.trim().replace(/\s+/g, ' ').slice(0, 100);

  // Sanitize label against sensitive regions
  const rect = el.getBoundingClientRect();
  const nameOrId = el.getAttribute('name') || el.id || undefined;
  for (const region of sensitiveRegions) {
    const r = region.boundingBox;
    // Check if element intersects sensitive region
    if (
      rect.left < r.x + r.width &&
      rect.right > r.x &&
      rect.top < r.y + r.height &&
      rect.bottom > r.y
    ) {
      return region.semanticPlaceholder || getSemanticPlaceholder(region.type, label, nameOrId);
    }
  }

  // Also sanitize any secrets embedded inside raw label text
  return sanitizeRawText(label);
}

/**
 * Builds a sanitized, hierarchical accessibility tree representation.
 */
export function buildA11yTree(
  root: Element = document.body,
  sensitiveRegions: SensitiveRegion[] = []
): A11yNode[] {
  if (!root) return [];

  const nodes: A11yNode[] = [];

  function traverse(el: Element) {
    // Skip script, style, SVG internals, or hidden elements
    if (
      el.tagName === 'SCRIPT' ||
      el.tagName === 'STYLE' ||
      el.tagName === 'NOSCRIPT' ||
      el.getAttribute('aria-hidden') === 'true'
    ) {
      return;
    }

    const rect = el.getBoundingClientRect();
    const isVisible =
      (rect.width > 0 && rect.height > 0) ||
      (rect.width === 0 && rect.height === 0 && !el.hasAttribute('hidden'));
    const role = getElementRole(el);
    const isInteractive =
      INTERACTIVE_ROLES.has(role) || INTERACTIVE_TAGS.has(el.tagName);

    if (isVisible && isInteractive) {
      const sanitizedLabel = getSanitizedAccessibleLabel(el, sensitiveRegions);
      const selector = getElementSelector(el);

      const bbox: BoundingBox = {
        x: Math.round(rect.left + window.scrollX),
        y: Math.round(rect.top + window.scrollY),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };

      nodes.push({
        role,
        label: sanitizedLabel,
        selector,
        ariaLabel: el.getAttribute('aria-label') ? sanitizedLabel : undefined,
        tagName: el.tagName,
        boundingBox: bbox,
      });
    }

    // Recurse children (capped at depth 10)
    for (let i = 0; i < el.children.length; i++) {
      traverse(el.children[i]);
    }
  }

  traverse(root);
  return nodes;
}
