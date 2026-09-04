import { DetectionType } from './types';

// ─── Risk scoring per type ────────────────────────────────────────────────────

export const RISK_WEIGHTS: Record<DetectionType, number> = {
  PASSWORD: 30,
  CARD: 30,
  GOV_ID: 25,
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
  let raw = 0;
  for (const item of items) {
    raw += (RISK_WEIGHTS[item.type] ?? 5) * item.confidence;
  }
  return Math.min(Math.round(raw), MAX_RISK_SCORE);
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
