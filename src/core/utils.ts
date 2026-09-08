import { DetectionType, DetectedItem, ScanResult, ScanReport, ThreatExplanation, ScanMetrics } from './types';

// ─── Risk scoring per type ────────────────────────────────────────────────────

export const RISK_WEIGHTS: Record<DetectionType, number> = {
  PASSWORD: 30,
  CARD: 30,
  GOV_ID: 25,
  AADHAAR: 25,
  PAN: 20,
  IFSC: 15,
  AWS_KEY: 25,
  AZURE_KEY: 25,
  OPENAI_KEY: 20,
  ANTHROPIC_KEY: 20,
  GITHUB_TOKEN: 20,
  STRIPE_KEY: 20,
  SUPABASE_KEY: 18,
  FIREBASE_CONFIG: 18,
  RAZORPAY_KEY: 18,
  JWT_SECRET: 15,
  MONGODB_URL: 15,
  POSTGRES_URL: 15,
  MYSQL_URL: 15,
  REDIS_URL: 12,
  GOOGLE_KEY: 15,
  API_KEY: 15,
  EMAIL: 10,
  PHONE: 10,
  NAME: 5,
  ADDRESS: 8,
  FACE: 12,
  OTHER: 5,
};

export const MAX_RISK_SCORE = 100;

export function computeRiskScore(
  items: Array<{ type: DetectionType; confidence: number }>
): number {
  if (!items || items.length === 0) return 0;

  const types = new Set(items.map((i) => i.type));

  let score = 0;

  const hasPassword = types.has('PASSWORD');
  const hasEmail = types.has('EMAIL');
  const hasCard = types.has('CARD');
  const hasGovId = types.has('GOV_ID') || types.has('AADHAAR') || types.has('PAN');

  const secretTypes: DetectionType[] = [
    'API_KEY', 'GITHUB_TOKEN', 'OPENAI_KEY', 'ANTHROPIC_KEY', 'GOOGLE_KEY',
    'JWT_SECRET', 'MONGODB_URL', 'POSTGRES_URL', 'MYSQL_URL', 'REDIS_URL',
    'AWS_KEY', 'AZURE_KEY', 'SUPABASE_KEY', 'FIREBASE_CONFIG', 'STRIPE_KEY', 'RAZORPAY_KEY', 'IFSC'
  ];

  const secretsPresent = secretTypes.filter((t) => types.has(t));

  if (secretsPresent.length > 1) {
    score = 100;
  } else if (secretsPresent.length === 1) {
    score = 80;
  } else if (hasCard || hasGovId) {
    score = 75;
  } else if (hasPassword && hasEmail) {
    score = 40;
  } else if (hasPassword) {
    score = 25;
  } else if (hasEmail) {
    score = 15;
  } else {
    let maxSub = 0;
    for (const item of items) {
      const weight = RISK_WEIGHTS[item.type] ?? 10;
      if (weight > maxSub) maxSub = weight;
    }
    score = maxSub;
  }

  return Math.min(Math.round(score), MAX_RISK_SCORE);
}

// ─── Generate a stable unique id ─────────────────────────────────────────────

export function generateId(): string {
  return `pf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Label helpers ────────────────────────────────────────────────────────────

export function getTypeLabel(type: DetectionType): string {
  const labels: Record<DetectionType, string> = {
    PASSWORD: 'Password',
    EMAIL: 'Email',
    PHONE: 'Phone',
    NAME: 'Name',
    ADDRESS: 'Address',
    GOV_ID: 'Gov. ID',
    AADHAAR: 'Aadhaar Card',
    PAN: 'PAN Card',
    IFSC: 'IFSC Code',
    CARD: 'Card Number',
    FACE: 'Face',
    API_KEY: 'API Key',
    GITHUB_TOKEN: 'GitHub Token',
    OPENAI_KEY: 'OpenAI Key',
    ANTHROPIC_KEY: 'Anthropic Key',
    GOOGLE_KEY: 'Google API Key',
    JWT_SECRET: 'JWT Secret',
    MONGODB_URL: 'MongoDB URL',
    POSTGRES_URL: 'PostgreSQL URL',
    MYSQL_URL: 'MySQL URL',
    REDIS_URL: 'Redis URL',
    AWS_KEY: 'AWS Key',
    AZURE_KEY: 'Azure Key',
    SUPABASE_KEY: 'Supabase Key',
    FIREBASE_CONFIG: 'Firebase Config',
    STRIPE_KEY: 'Stripe Key',
    RAZORPAY_KEY: 'Razorpay Key',
    OTHER: 'Other',
  };
  return labels[type] ?? type;
}

export function truncateValue(value: string, max = 40): string {
  if (value.length <= max) return value;
  return value.slice(0, max) + '…';
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatMs(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ─── Build Enterprise Scan Report (P1) ───────────────────────────────────────

export function buildScanReport(scan: ScanResult): ScanReport {
  const categories = {} as Record<DetectionType, number>;
  let totalConfidence = 0;
  let minConfidence = 1;

  for (const item of scan.items) {
    categories[item.type] = (categories[item.type] ?? 0) + 1;
    totalConfidence += item.confidence;
    if (item.confidence < minConfidence) minConfidence = item.confidence;
  }

  const confidenceAvg = scan.items.length > 0
    ? totalConfidence / scan.items.length
    : 0;

  let hostname = scan.url;
  try { hostname = new URL(scan.url).hostname; } catch { /* keep full URL */ }

  return {
    id: generateId(),
    website: hostname,
    url: scan.url,
    timestamp: scan.timestamp,
    isoDate: new Date(scan.timestamp).toISOString(),
    riskScore: scan.riskScore,
    totalDetections: scan.items.length,
    categories,
    confidenceAvg: Math.round(confidenceAvg * 1000) / 1000,
    confidenceMin: scan.items.length > 0 ? Math.round(minConfidence * 1000) / 1000 : 0,
    sanitizedPayload: scan.sanitizedPayload,
    browserVersion: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    extensionVersion: '1.0.0',
    metrics: scan.metrics ?? null,
    items: scan.items.map((item) => ({
      type: item.type,
      placeholder: item.placeholder,
      confidence: item.confidence,
      method: item.method,
      detectorType: item.method.toUpperCase(),
      status: item.status,
      location: item.location.pageLabel ?? item.location.selector ?? 'unknown',
      selector: item.location.selector,
      cssPath: item.location.cssPath,
      xpath: item.location.xpath,
      pageRegion: item.location.pageLabel,
      boundingBox: item.location.boundingBox,
    })),
  };
}

// ─── Build Threat Explanation (P6) ───────────────────────────────────────────

export function buildThreatExplanation(item: DetectedItem): ThreatExplanation {
  const explanations: Record<DetectionType, { why: string; rec: string }> = {
    PASSWORD: {
      why: 'A password input field was found on this page. The field type is "password", which is a definitive DOM signal.',
      rec: 'Do not autofill passwords on untrusted sites. Ensure HTTPS is active.',
    },
    EMAIL: {
      why: 'An email address pattern was matched by the RFC 5322 regex detector.',
      rec: 'Review whether this email address needs to be submitted to this domain.',
    },
    PHONE: {
      why: 'A phone number pattern matching standard formats (E.164, US, international) was found.',
      rec: 'Verify the recipient is trusted before submitting your phone number.',
    },
    CARD: {
      why: 'A credit/debit card number matching Luhn-valid patterns (Visa, Mastercard, Amex, Discover) was detected.',
      rec: 'Only enter card numbers on HTTPS payment pages with a valid merchant SSL certificate.',
    },
    GOV_ID: {
      why: "A government ID pattern (SSN, passport, driver's license) was found using regex.",
      rec: 'Never submit government IDs to sites that do not explicitly require them.',
    },
    AADHAAR: {
      why: 'A 12-digit Indian Aadhaar number validated by the Verhoeff checksum algorithm was detected.',
      rec: 'Never expose Aadhaar numbers publicly. Use masked Aadhaar where feasible.',
    },
    PAN: {
      why: 'An Indian Permanent Account Number (PAN) matching the 10-character alphanumeric structure was detected.',
      rec: 'Verify the authenticity of tax and financial portals before submitting PAN.',
    },
    IFSC: {
      why: 'An Indian Financial System Code (IFSC) matching standard banking branch formats was detected.',
      rec: 'Confirm the bank branch details before initiating fund transfers.',
    },
    NAME: {
      why: 'A personal name was inferred from field attributes (name, autocomplete, aria-label) or NER pattern matching.',
      rec: 'Confirm this site needs your real name. Consider using a pseudonym where possible.',
    },
    ADDRESS: {
      why: 'A physical address (street, city/state, ZIP) was identified by the NER heuristic detector.',
      rec: 'Only submit addresses to trusted e-commerce or service providers.',
    },
    FACE: {
      why: 'A human face was detected in an image on the page using computer vision.',
      rec: 'Ensure facial images are only shared with services that have explicit consent.',
    },
    API_KEY: {
      why: 'A high-entropy token matching the structure of an API key was found adjacent to keywords like "key", "token", or "secret".',
      rec: 'Rotate this key immediately if it appears in a public or untrusted context.',
    },
    GITHUB_TOKEN: {
      why: 'A GitHub personal access token (ghp_, gho_, ghu_, github_pat_) prefix was matched.',
      rec: 'Revoke this token at github.com/settings/tokens and regenerate it.',
    },
    OPENAI_KEY: {
      why: 'An OpenAI API key (sk-...) was found using the official key format regex.',
      rec: 'Revoke immediately at platform.openai.com/api-keys.',
    },
    ANTHROPIC_KEY: {
      why: 'An Anthropic API key (sk-ant-...) was detected.',
      rec: 'Revoke immediately at console.anthropic.com.',
    },
    GOOGLE_KEY: {
      why: 'A Google API key (AIza...) was found using the official prefix pattern.',
      rec: 'Restrict the key in Google Cloud Console and rotate it.',
    },
    JWT_SECRET: {
      why: 'A JSON Web Token (three base64url segments separated by dots) was detected.',
      rec: 'JWTs may contain sensitive claims. Verify this token is not exposed publicly.',
    },
    MONGODB_URL: {
      why: 'A MongoDB connection string with embedded credentials was detected.',
      rec: 'Rotate database credentials immediately and use environment variables.',
    },
    POSTGRES_URL: {
      why: 'A PostgreSQL connection URL with embedded credentials was detected.',
      rec: 'Rotate database credentials and never hardcode them in client-side code.',
    },
    MYSQL_URL: {
      why: 'A MySQL connection URL with embedded credentials was detected.',
      rec: 'Rotate database credentials and store them in a secrets manager.',
    },
    REDIS_URL: {
      why: 'A Redis connection URL (possibly with password) was detected.',
      rec: 'Rotate the Redis auth token and use a secrets manager.',
    },
    AWS_KEY: {
      why: 'An AWS access key ID (AKIA/ASIA prefix) was detected.',
      rec: 'Deactivate this key in the AWS IAM console immediately.',
    },
    AZURE_KEY: {
      why: 'An Azure connection string or SAS token was detected.',
      rec: 'Regenerate SAS tokens in the Azure portal and revoke compromised keys.',
    },
    SUPABASE_KEY: {
      why: 'A Supabase service role key (sbp_...) was detected.',
      rec: 'Rotate this key in the Supabase dashboard under Project Settings.',
    },
    FIREBASE_CONFIG: {
      why: 'A Firebase configuration object (apiKey, authDomain, etc.) was found.',
      rec: 'Restrict Firebase API keys using App Check and domain restrictions.',
    },
    STRIPE_KEY: {
      why: 'A Stripe API key (sk_test_, pk_live_, rk_live_) was detected.',
      rec: 'Roll this key immediately at dashboard.stripe.com/apikeys.',
    },
    RAZORPAY_KEY: {
      why: 'A Razorpay API key (rzp_live_) was detected.',
      rec: 'Regenerate this key in the Razorpay dashboard.',
    },
    OTHER: {
      why: 'A potentially sensitive value was identified that does not match a specific category.',
      rec: 'Review this value and determine if it should be submitted.',
    },
  };

  const methodLabels: Record<DetectedItem['method'], string> = {
    dom: 'DOM Attribute Scanner',
    regex: 'Regex Pattern Matcher',
    ner: 'Named Entity Recognizer (NER)',
    ocr: 'Optical Character Recognition (OCR)',
    cv: 'Computer Vision (Face Detection)',
    ml: 'Machine Learning Classifier',
    vision: 'Vision Model Classifier',
    fusion: 'Multi-Modal Hybrid Fusion',
  };

  const confidenceReasons: Record<DetectedItem['method'], string> = {
    dom: `Confidence ${Math.round(item.confidence * 100)}% — DOM-based detection (input type/autocomplete) is highly reliable.`,
    regex: `Confidence ${Math.round(item.confidence * 100)}% — Pattern matched a high-precision regex. False positive rate < 2%.`,
    ner: `Confidence ${Math.round(item.confidence * 100)}% — Heuristic NER matched structural patterns. May have higher false positive rate.`,
    ocr: `Confidence ${Math.round(item.confidence * 100)}% — OCR extracted text with this confidence. Verify visually.`,
    cv: `Confidence ${Math.round(item.confidence * 100)}% — Face detection model scored this region.`,
    ml: `Confidence ${Math.round(item.confidence * 100)}% — ML classifier output.`,
    vision: `Confidence ${Math.round(item.confidence * 100)}% — Vision model visual element classification.`,
    fusion: `Confidence ${Math.round(item.confidence * 100)}% — Multi-modal hybrid fusion consensus across multiple layers.`,
  };

  const expl = explanations[item.type] ?? explanations.OTHER;

  return {
    why: expl.why,
    detector: methodLabels[item.method] ?? item.method,
    confidenceReason: confidenceReasons[item.method] ?? `Confidence: ${Math.round(item.confidence * 100)}%`,
    recommendation: expl.rec,
  };
}


