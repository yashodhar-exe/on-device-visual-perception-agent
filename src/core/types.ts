// ─── Detection Types ──────────────────────────────────────────────────────────

export type DetectionType =
  | 'PASSWORD'
  | 'EMAIL'
  | 'PHONE'
  | 'NAME'
  | 'ADDRESS'
  | 'GOV_ID'
  | 'AADHAAR'
  | 'PAN'
  | 'IFSC'
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

export type DetectionMethod = 'dom' | 'regex' | 'ner' | 'ocr' | 'cv' | 'ml' | 'vision' | 'fusion';

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
  semanticPlaceholder?: string;
  variableName?: string;
}

// ─── Scan Result ─────────────────────────────────────────────────────────────

export interface ScanResult {
  url: string;
  tabId: number;
  timestamp: number;
  items: DetectedItem[];
  riskScore: number;
  sanitizedPayload: Record<string, string>;
  metrics?: ScanMetrics;
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

export type ScanStatus = 'idle' | 'scanning' | 'success' | 'failed' | 'restricted';

export type ScanErrorReason =
  | 'restricted_url'
  | 'no_content_script'
  | 'timeout'
  | 'permission_denied'
  | 'injection_failed'
  | 'unknown';

// ─── Extension State ─────────────────────────────────────────────────────────

export interface ExtensionState {
  enabled: boolean;
  currentUrl: string;
  currentTabId: number | null;
  scanStatus: ScanStatus;
  scanErrorReason?: ScanErrorReason | null;
  scanErrorMessage?: string | null;
  lastScan: ScanResult | null;
  stats: ProtectionStats;
  activityLog: ActivityEvent[];
  overlaysVisible: boolean;
  settings: ExtensionSettings;
  lastMetrics: ScanMetrics | null;
  // Vision Agent State extensions
  agentRunning?: boolean;
  latestSanitizedScreenshot?: string | null;
  latestA11yTree?: A11yNode[] | null;
  latestSensitiveRegions?: SensitiveRegion[] | null;
  pendingActions?: AgentAction[];
  actionHistory?: ActionResult[];
  auditLog?: PrivacyAuditRecord[];
  agentError?: string | null;
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
  | 'BLOCK_REQUEST'
  | 'GET_SETTINGS'
  | 'SAVE_SETTINGS'
  | 'GET_REPORT'
  | 'CAPTURE_SCREENSHOT'
  | 'ANALYZE_PAGE'
  | 'EXECUTE_ACTION'
  | 'CONFIRM_ACTION'
  | 'REJECT_ACTION'
  | 'GET_AUDIT_LOG'
  | 'CLEAR_AUDIT_LOG'
  | 'AGENT_STATUS';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

// ─── Scan Performance Metrics ─────────────────────────────────────────────────

export interface ScanMetrics {
  domScanMs: number;
  regexMs: number;
  nerMs: number;
  ocrMs: number;
  faceMs: number;
  overlayRenderMs: number;
  totalMs: number;
}

// ─── Enterprise Scan Report ───────────────────────────────────────────────────

export interface ScanReport {
  id: string;
  website: string;
  url: string;
  timestamp: number;
  isoDate: string;
  riskScore: number;
  totalDetections: number;
  categories: Record<DetectionType, number>;
  confidenceAvg: number;
  confidenceMin: number;
  sanitizedPayload: Record<string, string>;
  browserVersion: string;
  extensionVersion: string;
  metrics: ScanMetrics | null;
  items: Array<{
    type: DetectionType;
    placeholder: string;
    confidence: number;
    method: DetectionMethod;
    detectorType: string;
    status: DetectionStatus;
    location: string;
    selector?: string;
    cssPath?: string;
    xpath?: string;
    pageRegion?: string;
    boundingBox?: BoundingBox;
  }>;
}

// ─── Extension Settings ───────────────────────────────────────────────────────

export interface ExtensionSettings {
  detectPasswords: boolean;
  detectEmails: boolean;
  detectPhones: boolean;
  detectCards: boolean;
  detectSecrets: boolean;   // API keys, tokens, DB URLs
  detectNer: boolean;
  detectOcr: boolean;
  detectFaces: boolean;
  autoScan: boolean;
  mutationObserver: boolean;
  networkProtection: boolean;
  developerMode: boolean;
  // Vision Agent settings
  agentMode: boolean;
  serverEndpoint: string;
  agentConfirmSensitive: boolean;
  autoRedactMode: 'blackout' | 'blur';
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  detectPasswords: true,
  detectEmails: true,
  detectPhones: true,
  detectCards: true,
  detectSecrets: true,
  detectNer: true,
  detectOcr: false,   // Off by default — expensive
  detectFaces: false, // Off by default — requires model files
  autoScan: true,
  mutationObserver: true,
  networkProtection: true,
  developerMode: false,
  agentMode: false,
  serverEndpoint: 'http://localhost:8000',
  agentConfirmSensitive: true,
  autoRedactMode: 'blackout',
};

// ─── Threat Explanation ───────────────────────────────────────────────────────

export interface ThreatExplanation {
  why: string;
  detector: string;
  confidenceReason: string;
  recommendation: string;
}

// ─── Detection Category Groups ────────────────────────────────────────────────

export const CATEGORY_GROUPS: Record<string, DetectionType[]> = {
  Passwords: ['PASSWORD'],
  Emails: ['EMAIL'],
  Cards: ['CARD'],
  Phones: ['PHONE'],
  Identities: ['NAME', 'ADDRESS', 'GOV_ID', 'AADHAAR', 'PAN', 'FACE'],
  Secrets: [
    'API_KEY', 'GITHUB_TOKEN', 'OPENAI_KEY', 'ANTHROPIC_KEY', 'GOOGLE_KEY',
    'JWT_SECRET', 'MONGODB_URL', 'POSTGRES_URL', 'MYSQL_URL', 'REDIS_URL',
    'AWS_KEY', 'AZURE_KEY', 'SUPABASE_KEY', 'FIREBASE_CONFIG',
    'STRIPE_KEY', 'RAZORPAY_KEY', 'IFSC',
  ],
  Other: ['OTHER'],
};

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
  AADHAAR: 'rgba(185, 28, 28, 0.35)',
  PAN: 'rgba(180, 83, 9, 0.35)',
  IFSC: 'rgba(109, 40, 217, 0.35)',
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
  AADHAAR: '#B91C1C',
  PAN: '#B45309',
  IFSC: '#6D28D9',
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
  AADHAAR: '[AADHAAR]',
  PAN: '[PAN]',
  IFSC: '[IFSC]',
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

// ─── Vision Agent Interfaces ──────────────────────────────────────────────────

export type AgentActionType =
  | 'click'
  | 'type'
  | 'scroll'
  | 'select'
  | 'hover'
  | 'focus'
  | 'submit'
  | 'wait';

export interface AgentAction {
  action: AgentActionType;
  selector?: string;
  text?: string;
  valueRef?: string; // Symbolic reference e.g. "LOCAL_EMAIL", resolved in browser
  direction?: 'up' | 'down' | 'left' | 'right';
  value?: string;
  requiresConfirmation?: boolean;
  reason?: string;
  confidence?: number;
}

export interface ActionResult {
  action: AgentAction;
  success: boolean;
  timestamp: number;
  error?: string;
  targetVerified?: boolean;
}

export interface A11yNode {
  role: string;
  label: string;
  selector: string;
  ariaLabel?: string;
  tagName: string;
  boundingBox: BoundingBox;
  children?: A11yNode[];
}

export interface VisualElement {
  type: 'form' | 'button' | 'table' | 'dialog' | 'menu' | 'image' | 'chart' | 'code' | 'input';
  boundingBox: BoundingBox;
  confidence: number;
  label?: string;
}

export interface OcrResult {
  text: string;
  boundingBox: BoundingBox;
  confidence: number;
}

export interface SensitiveRegion {
  id: string;
  boundingBox: BoundingBox;
  sources: DetectionMethod[];
  type: DetectionType;
  confidence: number;
  valueSnippet?: string;
  redacted?: boolean;
  semanticPlaceholder?: string;
}

export interface AnalyzeRequest {
  screenshot?: string; // base64 PNG (sanitized / redacted)
  accessibilityTree?: A11yNode[];
  domStructure?: string; // sanitized HTML skeleton
  ocrText?: string; // sanitized OCR text
  url?: string; // stripped of sensitive query params
  taskDescription?: string;
  timestamp?: number;
  sanitizedScreenshotBase64?: string;
  sanitizedA11yTree?: A11yNode[];
  sanitizedDomSkeleton?: string;
  sanitizedOcr?: Array<OcrResult | { text: string; boundingBox?: BoundingBox; confidence?: number }>;
}

export interface AnalyzeResponse {
  actions: AgentAction[];
  reasoning: string;
  confidence: number;
  policySafe: boolean;
}

export interface PrivacyAuditRecord {
  id: string;
  timestamp: number;
  url: string;
  detectionsCount: number;
  redactionsCount: number;
  rawPiiTransmitted: number; // Must always be 0
  payloadSafe: boolean;
  serverCalled: boolean;
  actionsReceived: number;
  actionsExecuted: number;
  latencyMs?: number;
}

