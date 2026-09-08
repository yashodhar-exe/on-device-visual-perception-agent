/**
 * domSkeleton.ts
 *
 * Sanitized DOM Skeleton Builder:
 * Extracts a lightweight structural HTML skeleton of interactive containers
 * (forms, inputs, buttons, tables) while stripping all sensitive input values,
 * cookies, tokens, and unnecessary attributes.
 */

import { SensitiveRegion } from '../core/types';
import { sanitizeRawText, getSemanticPlaceholder } from '../sanitization/sanitizer';

/**
 * Builds a sanitized DOM skeleton string for the AI server.
 * Preserves structural tags and semantic context while stripping raw secrets.
 */
export function buildDomSkeleton(
  root: Element = document.body,
  sensitiveRegions: SensitiveRegion[] = []
): string {
  if (!root) return '';

  const skeletonLines: string[] = [];

  function visit(el: Element, depth: number) {
    if (depth > 6) return; // Cap depth

    const tag = el.tagName.toLowerCase();

    // Skip non-UI structural tags
    if (['script', 'style', 'noscript', 'meta', 'link', 'svg'].includes(tag)) {
      return;
    }

    const isContainer = ['form', 'main', 'nav', 'header', 'footer', 'section', 'article', 'div', 'p', 'pre', 'code'].includes(tag);
    const isInteractive = ['input', 'button', 'select', 'textarea', 'a'].includes(tag);

    if (isInteractive || isContainer) {
      const indent = '  '.repeat(depth);
      const idAttr = el.id ? ` id="${el.id}"` : '';
      const typeAttr = el.getAttribute('type') ? ` type="${el.getAttribute('type')}"` : '';
      const nameAttr = el.getAttribute('name') ? ` name="${el.getAttribute('name')}"` : '';
      const roleAttr = el.getAttribute('role') ? ` role="${el.getAttribute('role')}"` : '';

      if (isInteractive) {
        if (tag === 'button' || tag === 'a') {
          const rawText = (el.textContent || '').trim().slice(0, 40);
          const cleanText = sanitizeRawText(rawText);
          skeletonLines.push(`${indent}<${tag}${idAttr}${typeAttr}${nameAttr}${roleAttr}>${cleanText}</${tag}>`);
        } else {
          // For inputs/textareas: preserve structural identity with safe semantic placeholder
          let semanticAttr = '';
          const isPassword = typeAttr.includes('password') || nameAttr.toLowerCase().includes('pass');
          const isEmail = typeAttr.includes('email') || nameAttr.toLowerCase().includes('email');
          const isKey = nameAttr.toLowerCase().includes('key') || idAttr.toLowerCase().includes('key');

          if (isPassword) {
            semanticAttr = ' data-placeholder="PASSWORD=YOUR_PASSWORD"';
          } else if (isEmail) {
            semanticAttr = ' data-placeholder="EMAIL=YOUR_EMAIL"';
          } else if (isKey) {
            const varName = el.getAttribute('name') || el.id;
            semanticAttr = ` data-placeholder="${getSemanticPlaceholder('API_KEY', undefined, varName)}"`;
          }

          skeletonLines.push(`${indent}<${tag}${idAttr}${typeAttr}${nameAttr}${roleAttr}${semanticAttr} />`);
        }
      } else if (el.children.length === 0 && (el.textContent || '').trim().length > 0) {
        // Leaf container node with text content (e.g. <div>KEY=secret</div> or <code>...</code>)
        const rawContent = (el.textContent || '').trim().slice(0, 120);
        const cleanContent = sanitizeRawText(rawContent);
        skeletonLines.push(`${indent}<${tag}${idAttr}${roleAttr}>${cleanContent}</${tag}>`);
      } else if (el.children.length > 0) {
        skeletonLines.push(`${indent}<${tag}${idAttr}${roleAttr}>`);
      }
    }

    for (let i = 0; i < el.children.length; i++) {
      visit(el.children[i], depth + 1);
    }

    if (isContainer && el.children.length > 0) {
      const indent = '  '.repeat(depth);
      skeletonLines.push(`${indent}</${tag}>`);
    }
  }

  visit(root, 0);
  return skeletonLines.join('\n');
}
