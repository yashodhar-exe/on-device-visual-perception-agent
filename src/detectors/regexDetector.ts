import { DetectionType } from '../core/types';

// ─── Regex Patterns ───────────────────────────────────────────────────────────

export const PATTERNS: Record<DetectionType, RegExp | null> = {
  EMAIL: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,

  PHONE: /(?:\+?(\d{1,3})[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,

  CARD: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g,

  GOV_ID: /\b(?:[0-9]{3}-[0-9]{2}-[0-9]{4}|[A-Z]{2}[0-9]{7}|[A-Z][0-9]{8})\b/g,

  // API Keys — generic high-entropy tokens
  API_KEY:
    /\b(?:[A-Za-z0-9_\-]{20,})\b(?=.*(?:key|token|secret|api|access|auth))/gi,

  // OpenAI
  OPENAI_KEY: /\bsk-[a-zA-Z0-9]{20,80}\b/g,

  // Anthropic
  ANTHROPIC_KEY: /\bsk-ant-[a-zA-Z0-9\-_]{20,100}\b/g,

  // GitHub personal access tokens (classic + fine-grained)
  GITHUB_TOKEN: /\b(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)[a-zA-Z0-9_]{20,}\b/g,

  // Google API keys
  GOOGLE_KEY: /\bAIza[0-9A-Za-z\-_]{35}\b/g,

  // JWT
  JWT_SECRET: /\beyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\b/g,

  // MongoDB
  MONGODB_URL:
    /mongodb(?:\+srv)?:\/\/[a-zA-Z0-9._~!$&'()*+,;=%-]+(?::[^@\s]+)?@[a-zA-Z0-9.\-]+(:\d+)?(\/[^\s]*)?/gi,

  // PostgreSQL
  POSTGRES_URL:
    /postgres(?:ql)?:\/\/[a-zA-Z0-9._~!$&'()*+,;=%-]+(?::[^@\s]+)?@[a-zA-Z0-9.\-]+(:\d+)?(\/[^\s]*)?/gi,

  // MySQL
  MYSQL_URL:
    /mysql:\/\/[a-zA-Z0-9._~!$&'()*+,;=%-]+(?::[^@\s]+)?@[a-zA-Z0-9.\-]+(:\d+)?(\/[^\s]*)?/gi,

  // Redis
  REDIS_URL: /redis(?:s)?:\/\/(?:[^@\s]+@)?[a-zA-Z0-9.\-]+(:\d+)?(\/\d*)?\b/gi,

  // AWS Access Key ID + Secret
  AWS_KEY: /\b(?:AKIA|ASIA|AROA|AIDA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}\b/g,

  // Azure SAS / connection strings
  AZURE_KEY:
    /(?:DefaultEndpointsProtocol|AccountName|AccountKey|SharedAccessSignature)[^;\n"']{8,}/gi,

  // Supabase
  SUPABASE_KEY: /\bsbp_[a-zA-Z0-9]{20,80}\b/g,

  // Firebase config object keys
  FIREBASE_CONFIG:
    /(?:apiKey|authDomain|databaseURL|storageBucket|messagingSenderId|appId|measurementId)\s*:\s*["'][^"']{5,}["']/gi,

  // Stripe
  STRIPE_KEY: /\b(?:sk|pk|rk)_(?:live|test)_[a-zA-Z0-9]{20,80}\b/g,

  // Razorpay
  RAZORPAY_KEY: /\brzp_(?:live|test)_[a-zA-Z0-9]{14,40}\b/g,

  // Password fields (handled by DOM, not regex)
  PASSWORD: null,
  NAME: null,
  ADDRESS: null,
  FACE: null,
  OTHER: null,
};

// ─── High-entropy string detection ───────────────────────────────────────────

export function shannonEntropy(s: string): number {
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

// ─── Run all regex patterns against a text string ────────────────────────────

export interface RegexMatch {
  type: DetectionType;
  value: string;
  index: number;
}

export function runAllPatterns(text: string): RegexMatch[] {
  const results: RegexMatch[] = [];

  for (const [type, pattern] of Object.entries(PATTERNS) as [
    DetectionType,
    RegExp | null,
  ][]) {
    if (!pattern) continue;
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      results.push({ type, value: match[0], index: match.index });
      // Prevent infinite loops for zero-length matches
      if (match[0].length === 0) pattern.lastIndex++;
    }
  }

  return results;
}
