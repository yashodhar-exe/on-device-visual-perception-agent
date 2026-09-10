/**
 * contentProvenance.ts
 *
 * Explicit Content Provenance & Directional Privacy Boundary
 *
 * Core Invariant:
 *  INPUT  → PROTECT  (User input is locally sanitized before leaving the browser)
 *  OUTPUT → PRESERVE (Webpage-owned output remains 100% untouched as rendered)
 *
 * Provenance categories:
 *  - USER_INPUT: Active user-controlled inputs (textarea, input, contenteditable, AI composer)
 *  - WEBPAGE_CONTENT: Static text, AI responses, chat history, documentation, code examples, UI labels
 *  - UNKNOWN: Handled conservatively without arbitrary DOM rewriting
 */

import { DetectedItem } from '../core/types';
import { runAllPatterns } from '../detectors/regexDetector';
import {
  getSemanticPlaceholder,
  extractVariableNameFromContext,
} from '../sanitization/semanticPlaceholder';

export type ContentProvenance = 'USER_INPUT' | 'WEBPAGE_CONTENT' | 'UNKNOWN';

/** Selectors identifying AI assistant responses and generated output */
const ASSISTANT_RESPONSE_SELECTORS = [
  '[data-message-author-role="assistant"]',
  '[data-testid*="assistant" i]',
  '.agent-turn',
  '[data-message-model-slug]',
  '.font-claude-message',
  '[data-is-streaming]',
  '.response-content',
  '.ai-response',
  '.bot-message',
  '.model-response',
  '[data-author="assistant" i]',
  '[data-role="assistant" i]',
  '.assistant-message',
  '.ai-turn',
  '.model-turn',
  '.chat-response',
];

/** Selectors identifying conversation history and rendered thread items */
const CONVERSATION_HISTORY_SELECTORS = [
  '[data-testid*="conversation" i]',
  '[data-testid*="chat-turn" i]',
  '[data-testid*="message-bubble" i]',
  '.conversation-item',
  '.chat-history',
  '.thread-history',
  'article[data-testid]',
  'div[data-message-id]',
  '[role="log"]',
  '.chat-log',
  '.message-list',
  '.chat-messages',
  '.history-container',
];

/** Selectors identifying active AI composers */
const AI_COMPOSER_SELECTORS = [
  '#prompt-textarea',
  'div.rich-textarea',
  'textarea[data-id]',
  'textarea[placeholder*="ask" i]',
  'textarea[placeholder*="message" i]',
  'textarea[placeholder*="prompt" i]',
  'div[contenteditable="true"][data-placeholder*="ask" i]',
  'div[contenteditable="true"][role="textbox"]',
  '[data-testid*="composer" i]',
  '[data-testid*="prompt-input" i]',
  '.composer-container textarea',
  '.composer-container [contenteditable="true"]',
];

/**
 * Checks if an element belongs to AI-generated output (assistant response or system notice).
 */
export function isAssistantResponse(element: Element | null | undefined): boolean {
  if (!element || !element.closest) return false;
  return ASSISTANT_RESPONSE_SELECTORS.some((selector) => {
    try {
      return element.matches?.(selector) || Boolean(element.closest?.(selector));
    } catch {
      return false;
    }
  });
}

/**
 * Checks if an element belongs to historical conversation turns or past messages.
 */
export function isConversationHistory(element: Element | null | undefined): boolean {
  if (!element || !element.closest) return false;
  return CONVERSATION_HISTORY_SELECTORS.some((selector) => {
    try {
      return element.matches?.(selector) || Boolean(element.closest?.(selector));
    } catch {
      return false;
    }
  });
}

/**
 * Checks if an element is an active, user-controlled composer element.
 */
export function isAiComposer(element: Element | null | undefined): boolean {
  if (!element || !element.closest) return false;
  return AI_COMPOSER_SELECTORS.some((selector) => {
    try {
      return element.matches?.(selector) || Boolean(element.closest?.(selector));
    } catch {
      return false;
    }
  });
}

/**
 * Determines whether an element is an interactive user-controlled input field.
 */
export function isUserInputElement(element: Element | null | undefined): boolean {
  if (!element) return false;

  // Rendered AI output or historical messages are NEVER active user input
  if (isAssistantResponse(element)) return false;

  // Interactive textarea
  if (element instanceof HTMLTextAreaElement) {
    return !element.readOnly && !element.disabled;
  }

  // Interactive input (excluding static/button/hidden types)
  if (element instanceof HTMLInputElement) {
    const type = (element.type || 'text').toLowerCase();
    const nonInputTypes = ['hidden', 'submit', 'button', 'reset', 'image', 'checkbox', 'radio'];
    if (nonInputTypes.includes(type)) return false;
    return !element.readOnly && !element.disabled;
  }

  // Contenteditable element
  if (
    element instanceof HTMLElement &&
    (element.isContentEditable ||
      element.getAttribute('contenteditable') === 'true' ||
      element.getAttribute('contenteditable') === '')
  ) {
    // Make sure it's not inside a read-only historical chat bubble
    if (isConversationHistory(element) && !isAiComposer(element)) {
      return false;
    }
    return true;
  }

  // Dedicated AI composer match
  if (isAiComposer(element)) {
    return true;
  }

  return false;
}

/**
 * Resolves the explicit ContentProvenance of a given DOM Element.
 */
export function determineElementProvenance(element: Element | null | undefined): ContentProvenance {
  if (!element) return 'UNKNOWN';

  // 1. Assistant responses and conversation history are always WEBPAGE_CONTENT
  if (isAssistantResponse(element) || isConversationHistory(element)) {
    // Only if it's the currently active editable composer inside a history container can it be user input
    if (isAiComposer(element) && isUserInputElement(element)) {
      return 'USER_INPUT';
    }
    return 'WEBPAGE_CONTENT';
  }

  // 2. Active user-controlled inputs
  if (isUserInputElement(element)) {
    return 'USER_INPUT';
  }

  // 3. Static/display elements (documentation, examples, labels, headers, tables, etc.)
  const tagName = element.tagName ? element.tagName.toUpperCase() : '';
  const staticTags = [
    'P', 'SPAN', 'DIV', 'CODE', 'PRE', 'BLOCKQUOTE', 'LI', 'UL', 'OL',
    'TD', 'TH', 'TR', 'TABLE', 'ARTICLE', 'SECTION', 'HEADER', 'FOOTER',
    'NAV', 'ASIDE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LABEL', 'A',
    'BUTTON', 'FIGCAPTION', 'FIGURE', 'MARK', 'TIME', 'CITE', 'BODY', 'MAIN'
  ];

  if (staticTags.includes(tagName)) {
    // If it's a child node inside an editable user input, treat as USER_INPUT
    if (element.closest?.('textarea, input, [contenteditable="true"], [contenteditable=""]')) {
      return isUserInputElement(element.closest('textarea, input, [contenteditable="true"], [contenteditable=""]'))
        ? 'USER_INPUT'
        : 'WEBPAGE_CONTENT';
    }
    return 'WEBPAGE_CONTENT';
  }

  return 'WEBPAGE_CONTENT';
}

/**
 * Directional sanitization helper for outgoing USER_INPUT payloads.
 * Transforms raw user input into safe outgoing text using semantic placeholders.
 * Leaves webpage output untouched.
 */
export function sanitizeUserOutgoingPayload(
  rawInputText: string,
  userSuppliedMatches?: Array<{ type: any; value: string }>
): {
  sanitizedText: string;
  replacementCount: number;
} {
  if (!rawInputText || typeof rawInputText !== 'string') {
    return { sanitizedText: rawInputText, replacementCount: 0 };
  }

  const matches = userSuppliedMatches || runAllPatterns(rawInputText);
  if (matches.length === 0) {
    return { sanitizedText: rawInputText, replacementCount: 0 };
  }

  // Sort by length descending so longer tokens are replaced first
  const sorted = [...matches].sort((a, b) => b.value.length - a.value.length);
  let sanitized = rawInputText;
  let replacementCount = 0;

  for (const m of sorted) {
    if (!m.value || !sanitized.includes(m.value)) continue;

    const line = sanitized.split('\n').find((l) => l.includes(m.value)) || sanitized;
    const varName = extractVariableNameFromContext(line, m.value);
    const placeholder = getSemanticPlaceholder(m.type, line, varName || undefined);

    sanitized = sanitized.split(m.value).join(placeholder);
    replacementCount++;
  }

  return { sanitizedText: sanitized, replacementCount };
}
