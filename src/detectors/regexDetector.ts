/**
 * regexDetector.ts
 *
 * High-precision regex pattern matcher for PII, tokens, and credentials.
 * Includes Luhn algorithm validation for Credit Card numbers and confidence
 * scoring per pattern.
 */

import { DetectionType } from '../core/types';
import { isAllowlisted } from './allowlist';

export interface RegexMatch {
  type: DetectionType;
  value: string;
  index: number;
  confidence: number;
}

// ─── Luhn Algorithm Validation for Credit Cards ─────────────────────────────

export function validateLuhn(digits: string): boolean {
  const clean = digits.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(clean)) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// ─── Verhoeff Algorithm Validation for Aadhaar Numbers ───────────────────────

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function validateVerhoeff(digits: string): boolean {
  const clean = digits.replace(/[\s-]/g, '');
  if (!/^\d{12}$/.test(clean)) return false;
  // Aadhaar numbers do not start with 0 or 1, and reject 12 repeating identical digits
  if (clean.startsWith('0') || clean.startsWith('1') || /^(\d)\1{11}$/.test(clean)) return false;
  let c = 0;
  const inverted = clean.split('').reverse().map(Number);
  for (let i = 0; i < inverted.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][inverted[i]]];
  }
  return c === 0;
}

// ─── Patterns and Per-Detector Confidence ─────────────────────────────────────

interface PatternConfig {
  regex: RegExp | null;
  confidence: number;
}

export const PATTERN_CONFIGS: Record<DetectionType, PatternConfig> = {
  EMAIL: {
    regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
    confidence: 0.95,
  },

  PHONE: {
    regex: /(?:\+?(\d{1,3})[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b|(?:\+91|0)?[6-9]\d{9}\b/g,
    confidence: 0.85,
  },

  CARD: {
    regex: /\b(?:4[0-9]{3}[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}|5[1-5][0-9]{2}[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}|3[47][0-9]{2}[\s-]?[0-9]{4}[\s-]?[0-9]{5}|6(?:011|5[0-9]{2})[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4})\b/g,
    confidence: 0.98, // Verified by Luhn
  },

  GOV_ID: {
    regex: /\b(?:[0-9]{3}-[0-9]{2}-[0-9]{4}|[A-Z]{2}[0-9]{7}|[A-Z][0-9]{8})\b/g,
    confidence: 0.95,
  },

  AADHAAR: {
    regex: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    confidence: 0.98, // Verified by Verhoeff
  },

  PAN: {
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    confidence: 0.98,
  },

  IFSC: {
    regex: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    confidence: 0.95,
  },

  API_KEY: {
    regex: /\b(?:[A-Za-z0-9_\-]{20,})\b(?=.*(?:key|token|secret|api|access|auth))/gi,
    confidence: 0.80,
  },

  OPENAI_KEY: {
    regex: /\bsk-(?:proj-|admin-)?[a-zA-Z0-9\-_]{20,80}\b/g,
    confidence: 1.0,
  },

  ANTHROPIC_KEY: {
    regex: /\bsk-ant-[a-zA-Z0-9\-_]{20,100}\b/g,
    confidence: 1.0,
  },

  GITHUB_TOKEN: {
    regex: /\b(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)[a-zA-Z0-9_]{20,}\b/g,
    confidence: 1.0,
  },

  GOOGLE_KEY: {
    regex: /\bAIza[0-9A-Za-z\-_]{7,50}\b/g,
    confidence: 0.98,
  },

  JWT_SECRET: {
    regex: /\beyJ[A-Za-z0-9\-_]+(?:\.[A-Za-z0-9\-_]+){1,2}\b|\beyJ[A-Za-z0-9\-_]{15,}\b/g,
    confidence: 0.98,
  },

  MONGODB_URL: {
    regex: /mongodb(?:\+srv)?:\/\/[a-zA-Z0-9._~!$&'()*+,;=%-]+(?::[^@\s]+)?@[a-zA-Z0-9.\-]+(:\d+)?(\/[^\s]*)?/gi,
    confidence: 0.98,
  },

  POSTGRES_URL: {
    regex: /postgres(?:ql)?:\/\/[a-zA-Z0-9._~!$&'()*+,;=%-]+(?::[^@\s]+)?@[a-zA-Z0-9.\-]+(:\d+)?(\/[^\s]*)?/gi,
    confidence: 0.98,
  },

  MYSQL_URL: {
    regex: /mysql:\/\/[a-zA-Z0-9._~!$&'()*+,;=%-]+(?::[^@\s]+)?@[a-zA-Z0-9.\-]+(:\d+)?(\/[^\s]*)?/gi,
    confidence: 0.98,
  },

  REDIS_URL: {
    regex: /redis(?:s)?:\/\/(?:[^@\s]+@)?[a-zA-Z0-9.\-]+(:\d+)?(\/\d*)?\b/gi,
    confidence: 0.95,
  },

  AWS_KEY: {
    regex: /\b(?:AKIA|ASIA|AROA|AIDA|AIPA|ANPA|ANVA)[A-Z0-9]{16}\b/g,
    confidence: 1.0,
  },

  AZURE_KEY: {
    regex: /(?:DefaultEndpointsProtocol|AccountName|AccountKey|SharedAccessSignature)[^;\n"']{8,}/gi,
    confidence: 0.95,
  },

  SUPABASE_KEY: {
    regex: /\bsbp_[a-zA-Z0-9]{20,80}\b/g,
    confidence: 0.95,
  },

  FIREBASE_CONFIG: {
    regex: /(?:apiKey|authDomain|databaseURL|storageBucket|messagingSenderId|appId|measurementId)\s*:\s*["'][^"']{5,}["']/gi,
    confidence: 0.95,
  },

  STRIPE_KEY: {
    regex: /\b(?:sk|pk|rk)_(?:live|test)_[a-zA-Z0-9]{6,80}\b/g,
    confidence: 1.0,
  },

  RAZORPAY_KEY: {
    regex: /\brzp_(?:live|test)_[a-zA-Z0-9]{14,40}\b/g,
    confidence: 1.0,
  },

  PASSWORD: { regex: null, confidence: 1.0 },
  NAME: { regex: null, confidence: 0.85 },
  ADDRESS: { regex: null, confidence: 0.85 },
  FACE: { regex: null, confidence: 0.85 },
  OTHER: { regex: null, confidence: 0.70 },
};

// Legacy exports compatibility
export const PATTERNS: Record<DetectionType, RegExp | null> = Object.fromEntries(
  Object.entries(PATTERN_CONFIGS).map(([k, v]) => [k, v.regex])
) as Record<DetectionType, RegExp | null>;

// ─── Shannon Entropy Calculation ─────────────────────────────────────────────

export function shannonEntropy(s: string): number {
  if (!s) return 0;
  const freq = new Map<string, number>();
  for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
  let h = 0;
  for (const count of freq.values()) {
    const p = count / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

export function isHighEntropy(s: string, threshold = 4.2): boolean {
  return s.length >= 16 && shannonEntropy(s) > threshold;
}

// ─── Run All Patterns with Validation and Confidence ──────────────────────────

export function runAllPatterns(text: string): RegexMatch[] {
  if (!text || text.length === 0) return [];
  const results: RegexMatch[] = [];

  for (const [type, config] of Object.entries(PATTERN_CONFIGS) as [DetectionType, PatternConfig][]) {
    if (!config.regex) continue;

    const pattern = config.regex;
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const val = match[0];
      if (!val || val.length === 0) {
        pattern.lastIndex++;
        continue;
      }

      // Check allowlist
      if (isAllowlisted(val)) continue;

      // Do not classify variable names or configuration keys (followed by '=' or ':') as sensitive API keys
      if (type === 'API_KEY') {
        const afterIndex = match.index + val.length;
        const trailing = text.slice(afterIndex, afterIndex + 10);
        if (/^\s*[:=]/.test(trailing)) {
          continue; // It's a variable identifier, not the secret value
        }
      }

      // Special validation for Credit Cards (Luhn check required)
      if (type === 'CARD') {
        if (!validateLuhn(val)) {
          continue; // Discard invalid credit card numbers
        }
      }

      // Special validation for Aadhaar (Verhoeff check required)
      if (type === 'AADHAAR') {
        if (!validateVerhoeff(val)) {
          continue; // Discard invalid Aadhaar numbers
        }
      }

      // Special validation for Phone numbers (must have at least 7 digits)
      if (type === 'PHONE') {
        const digits = val.replace(/\D/g, '');
        if (digits.length < 7 || digits.length > 15) continue;
      }

      results.push({
        type,
        value: val,
        index: match.index,
        confidence: config.confidence,
      });
    }
  }

  return results;
}
