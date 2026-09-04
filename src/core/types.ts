// ─── Detection Types ──────────────────────────────────────────────────────────

export type DetectionType =
  | 'PASSWORD'
  | 'EMAIL'
  | 'PHONE'
  | 'NAME'
  | 'ADDRESS'
  | 'GOV_ID'
  | 'CARD'
  | 'FACE'
  | 'API_KEY'
  | 'GITHUB_TOKEN'
  | 'OPENAI_KEY'
  | 'ANTHROPIC_KEY'
  | 'GOOGLE_KEY'
  | 'JWT_SECRET'
  | 'MONGODB_URL'
  | 'POSTGRES_URL'
  | 'MYSQL_URL'
  | 'REDIS_URL'
  | 'AWS_KEY'
  | 'AZURE_KEY'
  | 'SUPABASE_KEY'
  | 'FIREBASE_CONFIG'
  | 'STRIPE_KEY'
  | 'RAZORPAY_KEY'
  | 'OTHER';

export type DetectionMethod = 'dom' | 'regex' | 'ner' | 'ocr' | 'cv' | 'ml';

export type DetectionStatus = 'detected' | 'redacted' | 'blocked' | 'ignored';

// ─── Bounding Box ─────────────────────────────────────────────────────────────

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── DOM Location Info ────────────────────────────────────────────────────────

export interface LocationInfo {
  boundingBox: BoundingBox;
  selector?: string;
  xpath?: string;
  cssPath?: string;
  pageLabel?: string; // e.g. "Login Form", "Profile Page"
}

// ─── Detected Item ────────────────────────────────────────────────────────────

export interface DetectedItem {
  id: string;
  type: DetectionType;
  value: string;
  placeholder: string;
  confidence: number;
  method: DetectionMethod;
  status: DetectionStatus;
  location: LocationInfo;
  timestamp: number;
}

// ─── Scan Result ─────────────────────────────────────────────────────────────

export interface ScanResult {
  url: string;
  tabId: number;
  timestamp: number;
  items: DetectedItem[];
  riskScore: number;
  sanitizedPayload: Record<string, string>;
}

// ─── Sanitized Payload ───────────────────────────────────────────────────────

export interface SanitizedPayload {
  [key: string]: string | SanitizedPayload;
}

// ─── Protection Stats ─────────────────────────────────────────────────────────

export interface ProtectionStats {
  protected: number;
  blocked: number;
  warnings: number;
}

// ─── Activity Event ──────────────────────────────────────────────────────────

export interface ActivityEvent {
  id: string;
  timestamp: number;
  type: DetectionType;
  action: string;
  url: string;
}

// ─── Extension State ─────────────────────────────────────────────────────────

export interface ExtensionState {
  enabled: boolean;
  currentUrl: string;
  currentTabId: number | null;
  lastScan: ScanResult | null;
  stats: ProtectionStats;
  activityLog: ActivityEvent[];
  overlaysVisible: boolean;
}

// ─── Messages between content script and background ──────────────────────────

export type MessageType =
  | 'SCAN_PAGE'
  | 'SCAN_COMPLETE'
  | 'TOGGLE_OVERLAYS'
  | 'REDACT_ITEM'
  | 'GET_STATE'
  | 'STATE_UPDATE'
  | 'CLEAR_OVERLAYS'
  | 'BLOCK_REQUEST';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

// ─── Overlay Colors ──────────────────────────────────────────────────────────

export const OVERLAY_COLORS: Record<DetectionType, string> = {
  PASSWORD: 'rgba(185, 28, 28, 0.35)',      // red
  API_KEY: 'rgba(180, 83, 9, 0.35)',        // orange
  GITHUB_TOKEN: 'rgba(180, 83, 9, 0.35)',
  OPENAI_KEY: 'rgba(180, 83, 9, 0.35)',
  ANTHROPIC_KEY: 'rgba(180, 83, 9, 0.35)',
  GOOGLE_KEY: 'rgba(180, 83, 9, 0.35)',
  JWT_SECRET: 'rgba(180, 83, 9, 0.35)',
  MONGODB_URL: 'rgba(180, 83, 9, 0.35)',
  POSTGRES_URL: 'rgba(180, 83, 9, 0.35)',
  MYSQL_URL: 'rgba(180, 83, 9, 0.35)',
  REDIS_URL: 'rgba(180, 83, 9, 0.35)',
  AWS_KEY: 'rgba(180, 83, 9, 0.35)',
  AZURE_KEY: 'rgba(180, 83, 9, 0.35)',
  SUPABASE_KEY: 'rgba(180, 83, 9, 0.35)',
  FIREBASE_CONFIG: 'rgba(180, 83, 9, 0.35)',
  STRIPE_KEY: 'rgba(180, 83, 9, 0.35)',
  RAZORPAY_KEY: 'rgba(180, 83, 9, 0.35)',
  EMAIL: 'rgba(37, 99, 235, 0.35)',         // blue
  PHONE: 'rgba(21, 128, 61, 0.35)',         // green
  CARD: 'rgba(109, 40, 217, 0.35)',         // purple
  ADDRESS: 'rgba(161, 161, 20, 0.35)',      // yellow
  NAME: 'rgba(37, 99, 235, 0.25)',
  GOV_ID: 'rgba(185, 28, 28, 0.35)',
  FACE: 'rgba(21, 128, 61, 0.35)',
  OTHER: 'rgba(100, 116, 139, 0.35)',
};

export const OVERLAY_BORDER_COLORS: Record<DetectionType, string> = {
  PASSWORD: '#B91C1C',
  API_KEY: '#B45309',
  GITHUB_TOKEN: '#B45309',
  OPENAI_KEY: '#B45309',
  ANTHROPIC_KEY: '#B45309',
  GOOGLE_KEY: '#B45309',
  JWT_SECRET: '#B45309',
  MONGODB_URL: '#B45309',
  POSTGRES_URL: '#B45309',
  MYSQL_URL: '#B45309',
  REDIS_URL: '#B45309',
  AWS_KEY: '#B45309',
  AZURE_KEY: '#B45309',
  SUPABASE_KEY: '#B45309',
  FIREBASE_CONFIG: '#B45309',
  STRIPE_KEY: '#B45309',
  RAZORPAY_KEY: '#B45309',
  EMAIL: '#2563EB',
  PHONE: '#15803D',
  CARD: '#6D28D9',
  ADDRESS: '#A16207',
  NAME: '#2563EB',
  GOV_ID: '#B91C1C',
  FACE: '#15803D',
  OTHER: '#64748B',
};

// ─── Placeholder Map ──────────────────────────────────────────────────────────

export const PLACEHOLDER_MAP: Record<DetectionType, string> = {
  PASSWORD: '[PASSWORD]',
  EMAIL: '[EMAIL]',
  PHONE: '[PHONE]',
  NAME: '[NAME]',
  ADDRESS: '[ADDRESS]',
  GOV_ID: '[GOV_ID]',
  CARD: '[CARD]',
  FACE: '[FACE_REDACTED]',
  API_KEY: '[API_KEY]',
  GITHUB_TOKEN: '[GITHUB_TOKEN]',
  OPENAI_KEY: '[OPENAI_KEY]',
  ANTHROPIC_KEY: '[ANTHROPIC_KEY]',
  GOOGLE_KEY: '[GOOGLE_KEY]',
  JWT_SECRET: '[JWT_SECRET]',
  MONGODB_URL: '[MONGODB_URL]',
  POSTGRES_URL: '[POSTGRES_URL]',
  MYSQL_URL: '[MYSQL_URL]',
  REDIS_URL: '[REDIS_URL]',
  AWS_KEY: '[AWS_KEY]',
  AZURE_KEY: '[AZURE_KEY]',
  SUPABASE_KEY: '[SUPABASE_KEY]',
  FIREBASE_CONFIG: '[FIREBASE_CONFIG]',
  STRIPE_KEY: '[STRIPE_KEY]',
  RAZORPAY_KEY: '[RAZORPAY_KEY]',
  OTHER: '[REDACTED]',
};
