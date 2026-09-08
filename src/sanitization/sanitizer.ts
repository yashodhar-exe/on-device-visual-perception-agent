/**
 * sanitizer.ts
 *
 * Build the sanitized JSON payload.
 *
 * Rules:
 *  1. Walk all detected items
 *  2. Replace sensitive values with their placeholder tokens
 *  3. Preserve semantic keys (e.g. email, password, phone, card, gov_id, openai_key)
 *     based on element attributes or type slugs, instead of generic sequential name_1, name_2
 *  4. NEVER include original raw values in the output
 */

import { DetectedItem, SanitizedPayload } from '../core/types';
import { runAllPatterns } from '../detectors/regexDetector';
import { generateId } from '../core/utils';
import {
  getSemanticPlaceholder,
  sanitizeContextString,
  extractVariableNameFromContext,
  formatFormFieldPlaceholder,
} from './semanticPlaceholder';

export {
  getSemanticPlaceholder,
  sanitizeContextString,
  extractVariableNameFromContext,
  formatFormFieldPlaceholder,
};

/**
 * Derive a clean semantic key for a detected item based on element attributes or type slug.
 */
function deriveSemanticKey(item: DetectedItem): string {
  // 1. Type-based standard semantic mapping
  const typeMap: Record<string, string> = {
    EMAIL: 'email',
    PASSWORD: 'password',
    PHONE: 'phone',
    CARD: 'card',
    GOV_ID: 'gov_id',
    AADHAAR: 'aadhaar',
    PAN: 'pan',
    IFSC: 'ifsc',
    OPENAI_KEY: 'openai_key',
    ANTHROPIC_KEY: 'anthropic_key',
    GITHUB_TOKEN: 'github_token',
    GOOGLE_KEY: 'google_key',
    JWT_SECRET: 'jwt_secret',
    MONGODB_URL: 'mongodb_url',
    POSTGRES_URL: 'postgres_url',
    MYSQL_URL: 'mysql_url',
    REDIS_URL: 'redis_url',
    AWS_KEY: 'aws_key',
    AZURE_KEY: 'azure_key',
    SUPABASE_KEY: 'supabase_key',
    FIREBASE_CONFIG: 'firebase_config',
    STRIPE_KEY: 'stripe_key',
    RAZORPAY_KEY: 'razorpay_key',
    API_KEY: 'api_key',
    NAME: 'name',
    ADDRESS: 'address',
  };

  if (typeMap[item.type]) return typeMap[item.type];

  // 2. Fallback to ID attribute if present
  const sel = item.location?.selector || '';
  const idMatch = sel.match(/#([a-zA-Z0-9_\-]+)/);
  if (idMatch && idMatch[1]) {
    let cleanId = idMatch[1].replace(/-(input|textarea|field|box)$/i, '').replace(/[-]/g, '_').toLowerCase();
    if (cleanId === 'pw') cleanId = 'password';
    if (cleanId === 'apikey') cleanId = 'api_key';
    if (cleanId.length > 1) return cleanId;
  }

  return item.type.toLowerCase();
}

// ─── Build sanitized payload ──────────────────────────────────────────────────

export function buildSanitizedPayload(
  items: DetectedItem[],
  formContext?: Record<string, string>
): SanitizedPayload {
  const payload: SanitizedPayload = {};

  // If we have direct form field labels, use them
  if (formContext) {
    for (const [key, value] of Object.entries(formContext)) {
      const matched = items.find((item) => item.value === value);
      payload[key] = matched
        ? getSemanticPlaceholder(matched.type, undefined, key)
        : value;
    }
    return payload;
  }

  // Track key occurrences to handle multiple items of same type cleanly
  const keyCounts = new Map<string, number>();

  for (const item of items) {
    const baseKey = deriveSemanticKey(item);
    const count = (keyCounts.get(baseKey) ?? 0) + 1;
    keyCounts.set(baseKey, count);

    // Primary item gets base key (e.g. "email"), subsequent get "email_2", "email_3"
    const finalKey = count === 1 ? baseKey : `${baseKey}_${count}`;
    payload[finalKey] = getSemanticPlaceholder(item.type, undefined, baseKey);
  }

  return payload;
}

// ─── Sanitize arbitrary text string ──────────────────────────────────────────

export function sanitizeText(text: string, items: DetectedItem[]): string {
  let sanitized = text;
  // Sort by value length descending to replace longer matches first
  const sorted = [...items].sort((a, b) => b.value.length - a.value.length);
  for (const item of sorted) {
    if (item.value && item.value !== '[face]' && item.value.length > 0) {
      // Split into lines to perform context-preserving replacement
      const lines = sanitized.split('\n');
      const updatedLines = lines.map((line) => {
        if (line.includes(item.value)) {
          return sanitizeContextString(line, item.value, item.type);
        }
        return line;
      });
      sanitized = updatedLines.join('\n');

      // If value is still present (e.g. within single-line text without assignment):
      if (sanitized.includes(item.value)) {
        const fallback = getSemanticPlaceholder(
          item.type,
          undefined,
          undefined,
          item.location?.selector
        );
        sanitized = sanitized.split(item.value).join(fallback);
      }
    }
  }
  return sanitized;
}

/**
 * Automatically detects secrets and PII in arbitrary raw text (like OCR output or HTML)
 * and sanitizes each occurrence with context-preserving semantic placeholders.
 */
export function sanitizeRawText(text: string): string {
  if (!text) return text;
  const matches = runAllPatterns(text);
  if (matches.length === 0) return text;

  const items: DetectedItem[] = matches.map((m) => ({
    id: generateId(),
    type: m.type,
    value: m.value,
    placeholder: getSemanticPlaceholder(m.type),
    confidence: m.confidence,
    method: 'regex',
    status: 'detected',
    location: { boundingBox: { x: 0, y: 0, width: 0, height: 0 } },
    timestamp: Date.now(),
    semanticPlaceholder: getSemanticPlaceholder(m.type),
  }));

  return sanitizeText(text, items);
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
