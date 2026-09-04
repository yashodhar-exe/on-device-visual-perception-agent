/**
 * sanitizer.ts
 *
 * STEP 9 & 10 — Build the sanitized JSON payload.
 *
 * Rules:
 *  1. Walk all detected items
 *  2. Replace sensitive values with their placeholder tokens
 *  3. NEVER include original raw values in the output
 *  4. The returned SanitizedPayload is the ONLY thing safe to send to an LLM
 */

import { DetectedItem, SanitizedPayload } from '../core/types';

// ─── Build sanitized payload ──────────────────────────────────────────────────

export function buildSanitizedPayload(
  items: DetectedItem[],
  formContext?: Record<string, string>
): SanitizedPayload {
  const payload: SanitizedPayload = {};

  // If we have form field labels, use them as keys
  if (formContext) {
    for (const [key, value] of Object.entries(formContext)) {
      const matched = items.find((item) => item.value === value);
      payload[key] = matched ? matched.placeholder : value;
    }
    return payload;
  }

  // Otherwise, group by type
  const typeGroups = new Map<string, DetectedItem[]>();
  for (const item of items) {
    const existing = typeGroups.get(item.type) ?? [];
    existing.push(item);
    typeGroups.set(item.type, existing);
  }

  for (const [type, groupItems] of typeGroups.entries()) {
    if (groupItems.length === 1) {
      const key = type.toLowerCase();
      payload[key] = groupItems[0].placeholder;
    } else {
      groupItems.forEach((item, idx) => {
        const key = `${type.toLowerCase()}_${idx + 1}`;
        payload[key] = item.placeholder;
      });
    }
  }

  return payload;
}

// ─── Sanitize arbitrary text string ──────────────────────────────────────────

export function sanitizeText(text: string, items: DetectedItem[]): string {
  let sanitized = text;
  // Sort by value length descending to replace longer matches first
  const sorted = [...items].sort((a, b) => b.value.length - a.value.length);
  for (const item of sorted) {
    if (item.value && item.value !== '[face]') {
      sanitized = sanitized.split(item.value).join(item.placeholder);
    }
  }
  return sanitized;
}

// ─── Sanitize a JSON-like object ─────────────────────────────────────────────

export function sanitizeObject(
  obj: Record<string, unknown>,
  items: DetectedItem[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeText(value, items);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>, items);
    } else if (Array.isArray(value)) {
      result[key] = value.map((v) =>
        typeof v === 'string' ? sanitizeText(v, items) : v
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ─── Validate that payload contains no raw sensitive values ──────────────────

export function validatePayloadIsSafe(
  payload: Record<string, unknown>,
  items: DetectedItem[]
): { safe: boolean; violations: string[] } {
  const violations: string[] = [];
  const payloadStr = JSON.stringify(payload);

  for (const item of items) {
    if (
      item.value &&
      item.value !== '••••••••' &&
      item.value !== '[face]' &&
      item.value.length > 3 &&
      payloadStr.includes(item.value)
    ) {
      violations.push(`Raw ${item.type} value found: ${item.value.slice(0, 10)}…`);
    }
  }

  return { safe: violations.length === 0, violations };
}
