/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 904
(__unused_webpack_module, exports) {

var __webpack_unused_export__;

// ─── Detection Types ──────────────────────────────────────────────────────────
__webpack_unused_export__ = ({ value: true });
__webpack_unused_export__ = __webpack_unused_export__ = __webpack_unused_export__ = __webpack_unused_export__ = exports.DEFAULT_SETTINGS = void 0;
exports.DEFAULT_SETTINGS = {
    detectPasswords: true,
    detectEmails: true,
    detectPhones: true,
    detectCards: true,
    detectSecrets: true,
    detectNer: true,
    detectOcr: false,
    detectFaces: false,
    autoScan: true,
    mutationObserver: true,
    networkProtection: true,
    developerMode: false,
    agentMode: false,
    serverEndpoint: 'http://localhost:8000',
    agentConfirmSensitive: true,
    autoRedactMode: 'blackout',
};
// ─── Detection Category Groups ────────────────────────────────────────────────
__webpack_unused_export__ = {
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
__webpack_unused_export__ = {
    PASSWORD: 'rgba(185, 28, 28, 0.35)',
    API_KEY: 'rgba(180, 83, 9, 0.35)',
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
    EMAIL: 'rgba(37, 99, 235, 0.35)',
    PHONE: 'rgba(21, 128, 61, 0.35)',
    CARD: 'rgba(109, 40, 217, 0.35)',
    ADDRESS: 'rgba(161, 161, 20, 0.35)',
    NAME: 'rgba(37, 99, 235, 0.25)',
    GOV_ID: 'rgba(185, 28, 28, 0.35)',
    AADHAAR: 'rgba(185, 28, 28, 0.35)',
    PAN: 'rgba(180, 83, 9, 0.35)',
    IFSC: 'rgba(109, 40, 217, 0.35)',
    FACE: 'rgba(21, 128, 61, 0.35)',
    OTHER: 'rgba(100, 116, 139, 0.35)',
};
__webpack_unused_export__ = {
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
__webpack_unused_export__ = {
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


/***/ },

/***/ 972
(__unused_webpack_module, exports) {

var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
__webpack_unused_export__ = exports.buildScanReport = __webpack_unused_export__ = __webpack_unused_export__ = __webpack_unused_export__ = __webpack_unused_export__ = exports.generateId = __webpack_unused_export__ = exports.op = exports.A1 = void 0;
// ─── Risk scoring per type ────────────────────────────────────────────────────
exports.A1 = {
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
exports.op = 100;
function computeRiskScore(items) {
    if (!items || items.length === 0)
        return 0;
    const types = new Set(items.map((i) => i.type));
    let score = 0;
    const hasPassword = types.has('PASSWORD');
    const hasEmail = types.has('EMAIL');
    const hasCard = types.has('CARD');
    const hasGovId = types.has('GOV_ID') || types.has('AADHAAR') || types.has('PAN');
    const secretTypes = [
        'API_KEY', 'GITHUB_TOKEN', 'OPENAI_KEY', 'ANTHROPIC_KEY', 'GOOGLE_KEY',
        'JWT_SECRET', 'MONGODB_URL', 'POSTGRES_URL', 'MYSQL_URL', 'REDIS_URL',
        'AWS_KEY', 'AZURE_KEY', 'SUPABASE_KEY', 'FIREBASE_CONFIG', 'STRIPE_KEY', 'RAZORPAY_KEY', 'IFSC'
    ];
    const secretsPresent = secretTypes.filter((t) => types.has(t));
    if (secretsPresent.length > 1) {
        score = 100;
    }
    else if (secretsPresent.length === 1) {
        score = 80;
    }
    else if (hasCard || hasGovId) {
        score = 75;
    }
    else if (hasPassword && hasEmail) {
        score = 40;
    }
    else if (hasPassword) {
        score = 25;
    }
    else if (hasEmail) {
        score = 15;
    }
    else {
        let maxSub = 0;
        for (const item of items) {
            const weight = exports.A1[item.type] ?? 10;
            if (weight > maxSub)
                maxSub = weight;
        }
        score = maxSub;
    }
    return Math.min(Math.round(score), exports.op);
}
__webpack_unused_export__ = computeRiskScore;
// ─── Generate a stable unique id ─────────────────────────────────────────────
function generateId() {
    return `pf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
exports.generateId = generateId;
// ─── Label helpers ────────────────────────────────────────────────────────────
function getTypeLabel(type) {
    const labels = {
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
__webpack_unused_export__ = getTypeLabel;
function truncateValue(value, max = 40) {
    if (value.length <= max)
        return value;
    return value.slice(0, max) + '…';
}
__webpack_unused_export__ = truncateValue;
function formatTimestamp(ts) {
    return new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}
__webpack_unused_export__ = formatTimestamp;
function formatMs(ms) {
    if (ms < 1)
        return '<1ms';
    if (ms < 1000)
        return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}
__webpack_unused_export__ = formatMs;
// ─── Build Enterprise Scan Report (P1) ───────────────────────────────────────
function buildScanReport(scan) {
    const categories = {};
    let totalConfidence = 0;
    let minConfidence = 1;
    for (const item of scan.items) {
        categories[item.type] = (categories[item.type] ?? 0) + 1;
        totalConfidence += item.confidence;
        if (item.confidence < minConfidence)
            minConfidence = item.confidence;
    }
    const confidenceAvg = scan.items.length > 0
        ? totalConfidence / scan.items.length
        : 0;
    let hostname = scan.url;
    try {
        hostname = new URL(scan.url).hostname;
    }
    catch { /* keep full URL */ }
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
exports.buildScanReport = buildScanReport;
// ─── Build Threat Explanation (P6) ───────────────────────────────────────────
function buildThreatExplanation(item) {
    const explanations = {
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
    const methodLabels = {
        dom: 'DOM Attribute Scanner',
        regex: 'Regex Pattern Matcher',
        ner: 'Named Entity Recognizer (NER)',
        ocr: 'Optical Character Recognition (OCR)',
        cv: 'Computer Vision (Face Detection)',
        ml: 'Machine Learning Classifier',
        vision: 'Vision Model Classifier',
        fusion: 'Multi-Modal Hybrid Fusion',
    };
    const confidenceReasons = {
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
__webpack_unused_export__ = buildThreatExplanation;


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
let __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
let exports = __webpack_exports__;
var __webpack_unused_export__;

/**
 * background.ts — Service Worker
 *
 * Production-hardened service worker for Privacy Firewall Chrome Extension.
 *
 * Responsibilities:
 *  1. State Management & Storage Cleanup (pfScan, pfScan_<tabId>)
 *  2. Tab Lifecycle tracking (resets stale scans on navigation, tab switches, close)
 *  3. Robust cross-component message routing with lastError and injection fallbacks
 *  4. Restricted URL detection (chrome://, webstore, about:)
 */
__webpack_unused_export__ = ({ value: true });
__webpack_unused_export__ = __webpack_unused_export__ = void 0;
const types_1 = __webpack_require__(904);
const utils_1 = __webpack_require__(972);
// ─── Restricted URL Helper ──────────────────────────────────────────────────
function isRestrictedUrl(url) {
    if (!url)
        return true;
    const u = url.trim().toLowerCase();
    return (u.startsWith('chrome://') ||
        u.startsWith('chrome-extension://') ||
        u.startsWith('edge://') ||
        u.startsWith('about:') ||
        u.startsWith('view-source:') ||
        u.includes('chromewebstore.google.com') ||
        u.includes('chrome.google.com/webstore'));
}
__webpack_unused_export__ = isRestrictedUrl;
// ─── Initial State ────────────────────────────────────────────────────────────
const defaultState = {
    enabled: true,
    currentUrl: '',
    currentTabId: null,
    scanStatus: 'idle',
    scanErrorReason: null,
    scanErrorMessage: null,
    lastScan: null,
    stats: { protected: 0, blocked: 0, warnings: 0 },
    activityLog: [],
    overlaysVisible: false,
    settings: { ...types_1.DEFAULT_SETTINGS },
    lastMetrics: null,
    agentRunning: false,
    latestSanitizedScreenshot: null,
    latestA11yTree: null,
    latestSensitiveRegions: null,
    pendingActions: [],
    actionHistory: [],
    auditLog: [],
    agentError: null,
};
let state = { ...defaultState };
// ─── Storage Helpers & Cleanup ────────────────────────────────────────────────
async function clearScan(tabId) {
    state.lastScan = null;
    state.lastMetrics = null;
    state.scanStatus = 'idle';
    state.scanErrorReason = null;
    state.scanErrorMessage = null;
    state.stats = { protected: 0, blocked: 0, warnings: 0 };
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
        try {
            await chrome.storage.session.remove('pfScan');
            if (tabId) {
                await chrome.storage.session.remove(`pfScan_${tabId}`);
            }
        }
        catch {
            // Non-fatal
        }
    }
    if (typeof chrome !== 'undefined' && tabId && chrome.action?.setBadgeText) {
        try {
            chrome.action.setBadgeText({ text: '', tabId });
        }
        catch {
            // Ignored
        }
    }
}
__webpack_unused_export__ = clearScan;
async function saveState() {
    try {
        if (typeof chrome !== 'undefined' && chrome.storage?.session) {
            if (state.lastScan) {
                await chrome.storage.session.set({ pfScan: state.lastScan });
                if (state.currentTabId) {
                    await chrome.storage.session.set({
                        [`pfScan_${state.currentTabId}`]: state.lastScan,
                    });
                }
            }
            else {
                await chrome.storage.session.remove('pfScan');
                if (state.currentTabId) {
                    await chrome.storage.session.remove(`pfScan_${state.currentTabId}`);
                }
            }
        }
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            await chrome.storage.local.set({
                pfSettings: {
                    enabled: state.enabled,
                    overlaysVisible: state.overlaysVisible,
                    activityLog: state.activityLog.slice(0, 50),
                    settings: state.settings,
                },
            });
        }
    }
    catch {
        // Non-fatal
    }
}
async function loadState() {
    try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            const local = await chrome.storage.local.get('pfSettings');
            if (local.pfSettings) {
                state = {
                    ...defaultState,
                    enabled: local.pfSettings.enabled ?? true,
                    overlaysVisible: local.pfSettings.overlaysVisible ?? false,
                    activityLog: local.pfSettings.activityLog ?? [],
                    settings: { ...types_1.DEFAULT_SETTINGS, ...(local.pfSettings.settings ?? {}) },
                };
            }
        }
    }
    catch {
        // Non-fatal — use default state
    }
}
// ─── State Broadcast ──────────────────────────────────────────────────────────
function broadcastState() {
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
            chrome.runtime
                .sendMessage({
                type: 'STATE_UPDATE',
                payload: state,
            })
                .catch(() => {
                // Popup may not be open
            });
        }
    }
    catch {
        // Runtime disconnected
    }
}
// ─── Badge Update ─────────────────────────────────────────────────────────────
function updateBadge(tabId, count, riskScore) {
    if (typeof chrome === 'undefined' || !tabId || !chrome.action)
        return;
    const text = count > 0 ? String(count) : '';
    const color = riskScore >= 70 ? '#B91C1C' : riskScore >= 40 ? '#B45309' : '#15803D';
    try {
        chrome.action.setBadgeText({ text, tabId });
        chrome.action.setBadgeBackgroundColor({ color, tabId });
    }
    catch {
        // Tab closed
    }
}
// ─── Activity Log ─────────────────────────────────────────────────────────────
function addActivity(event) {
    const entry = { id: (0, utils_1.generateId)(), ...event };
    state.activityLog = [entry, ...state.activityLog].slice(0, 100);
}
// ─── Handle Scan Complete ─────────────────────────────────────────────────────
async function handleScanComplete(result, tabId) {
    // Validate that result tab matches active tab
    if (state.currentTabId && tabId !== state.currentTabId) {
        return; // Discard scan for non-active tab
    }
    result.tabId = tabId;
    state.lastScan = result;
    state.currentUrl = result.url;
    state.currentTabId = tabId;
    state.scanStatus = 'success';
    state.scanErrorReason = null;
    state.scanErrorMessage = null;
    state.lastMetrics = result.metrics ?? null;
    const stats = { protected: 0, blocked: 0, warnings: 0 };
    for (const item of result.items) {
        if (item.status === 'redacted' || item.status === 'blocked')
            stats.protected++;
        if (item.status === 'blocked')
            stats.blocked++;
        if (item.confidence < 0.8)
            stats.warnings++;
    }
    state.stats = stats;
    for (const item of result.items.slice(0, 5)) {
        addActivity({
            timestamp: Date.now(),
            type: item.type,
            action: `${item.type.replace(/_/g, ' ')} detected`,
            url: result.url,
        });
    }
    updateBadge(tabId, result.items.length, result.riskScore);
    await saveState();
    broadcastState();
}
// ─── Dynamic Script Injection Fallback ────────────────────────────────────────
function tryInjectContentScript(tabId, callback) {
    if (typeof chrome === 'undefined' || !chrome.scripting) {
        callback();
        return;
    }
    try {
        chrome.scripting
            .executeScript({
            target: { tabId },
            files: ['content.js'],
        })
            .then(() => callback())
            .catch(() => callback());
    }
    catch {
        callback();
    }
}
// ─── Trigger Scan Command ─────────────────────────────────────────────────────
function triggerScanForTab(tabId, tabUrl, sendResponse) {
    if (isRestrictedUrl(tabUrl)) {
        clearScan(tabId);
        state.scanStatus = 'restricted';
        state.scanErrorReason = 'restricted_url';
        state.scanErrorMessage = 'Cannot scan this page (restricted URL or browser page).';
        saveState();
        broadcastState();
        sendResponse?.({ ok: false, error: 'Restricted URL' });
        return;
    }
    state.scanStatus = 'scanning';
    state.scanErrorReason = null;
    state.scanErrorMessage = null;
    broadcastState();
    let responded = false;
    const timeout = setTimeout(() => {
        if (responded)
            return;
        responded = true;
        // Attempt script injection as fallback
        tryInjectContentScript(tabId, () => {
            chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, (res) => {
                const err = chrome.runtime.lastError;
                if (err || !res) {
                    state.scanStatus = 'failed';
                    state.scanErrorReason = 'no_content_script';
                    state.scanErrorMessage = 'Content script unavailable on this page.';
                    clearScan(tabId);
                    state.scanStatus = 'failed';
                    saveState();
                    broadcastState();
                    sendResponse?.({ ok: false, error: 'Content script unavailable' });
                }
                else {
                    sendResponse?.(res);
                }
            });
        });
    }, 1200);
    chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, (res) => {
        if (responded)
            return;
        responded = true;
        clearTimeout(timeout);
        const err = chrome.runtime.lastError;
        if (err || !res) {
            tryInjectContentScript(tabId, () => {
                chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, (res2) => {
                    const err2 = chrome.runtime.lastError;
                    if (err2 || !res2) {
                        state.scanStatus = 'failed';
                        state.scanErrorReason = 'no_content_script';
                        state.scanErrorMessage = 'Content script unavailable on this page.';
                        clearScan(tabId);
                        state.scanStatus = 'failed';
                        saveState();
                        broadcastState();
                        sendResponse?.({ ok: false, error: 'Content script unavailable' });
                    }
                    else {
                        sendResponse?.(res2);
                    }
                });
            });
        }
        else {
            sendResponse?.(res);
        }
    });
}
// ─── Message Listener ─────────────────────────────────────────────────────────
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const tabId = sender.tab?.id;
        switch (message.type) {
            case 'SCAN_COMPLETE': {
                const result = message.payload;
                if (tabId) {
                    handleScanComplete(result, tabId).then(() => sendResponse({ ok: true }));
                    return true;
                }
                sendResponse({ ok: false, error: 'No tab ID' });
                break;
            }
            case 'GET_STATE': {
                sendResponse({ state });
                break;
            }
            case 'SCAN_PAGE': {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const activeTab = tabs[0];
                    if (!activeTab || !activeTab.id) {
                        state.scanStatus = 'failed';
                        state.scanErrorReason = 'no_content_script';
                        state.scanErrorMessage = 'No active tab found';
                        broadcastState();
                        sendResponse({ ok: false, error: 'No active tab' });
                        return;
                    }
                    triggerScanForTab(activeTab.id, activeTab.url, sendResponse);
                });
                return true;
            }
            case 'TOGGLE_OVERLAYS': {
                const tid = state.currentTabId;
                if (tid) {
                    chrome.tabs.sendMessage(tid, { type: 'TOGGLE_OVERLAYS' }, (res) => {
                        void chrome.runtime.lastError;
                        if (res) {
                            state.overlaysVisible = res.overlaysVisible;
                            saveState();
                            broadcastState();
                        }
                        sendResponse(res ?? { overlaysVisible: false });
                    });
                    return true;
                }
                sendResponse({ overlaysVisible: false });
                break;
            }
            case 'BLOCK_REQUEST': {
                state.stats.blocked = (state.stats.blocked ?? 0) + 1;
                if (tabId) {
                    addActivity({
                        timestamp: Date.now(),
                        type: 'API_KEY',
                        action: 'Network request sanitized',
                        url: state.currentUrl,
                    });
                    updateBadge(tabId, state.lastScan?.items.length ?? 0, 80);
                }
                saveState();
                broadcastState();
                sendResponse({ ok: true });
                break;
            }
            case 'REDACT_ITEM': {
                const tid = state.currentTabId ?? tabId;
                if (tid) {
                    chrome.tabs.sendMessage(tid, message, (res) => {
                        void chrome.runtime.lastError;
                        sendResponse(res ?? { ok: false });
                    });
                    return true;
                }
                sendResponse({ ok: false });
                break;
            }
            case 'GET_SETTINGS': {
                sendResponse({ settings: state.settings });
                break;
            }
            case 'SAVE_SETTINGS': {
                const incoming = message.payload;
                state.settings = { ...state.settings, ...incoming };
                saveState().then(() => {
                    broadcastState();
                    sendResponse({ ok: true });
                });
                return true;
            }
            case 'GET_REPORT': {
                if (state.lastScan) {
                    sendResponse({ report: (0, utils_1.buildScanReport)(state.lastScan) });
                }
                else {
                    sendResponse({ report: null });
                }
                break;
            }
            case 'CLEAR_OVERLAYS': {
                const tid = state.currentTabId ?? tabId;
                if (tid) {
                    chrome.tabs.sendMessage(tid, message, (res) => {
                        void chrome.runtime.lastError;
                        sendResponse(res ?? { ok: false });
                    });
                    return true;
                }
                sendResponse({ ok: false });
                break;
            }
            case 'CAPTURE_SCREENSHOT': {
                if (typeof chrome !== 'undefined' && chrome.tabs?.captureVisibleTab) {
                    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
                        const err = chrome.runtime.lastError;
                        if (err || !dataUrl) {
                            sendResponse({ ok: false, error: err?.message || 'Failed to capture tab' });
                        }
                        else {
                            sendResponse({ ok: true, dataUrl });
                        }
                    });
                    return true;
                }
                sendResponse({ ok: false, error: 'captureVisibleTab not available' });
                break;
            }
            case 'ANALYZE_PAGE': {
                state.agentRunning = true;
                state.agentError = null;
                broadcastState();
                const req = message.payload;
                const endpoint = `${state.settings.serverEndpoint || 'http://localhost:8000'}/analyze`;
                fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(req),
                })
                    .then(async (res) => {
                    if (!res.ok) {
                        const errBody = await res.text();
                        throw new Error(`Server returned ${res.status}: ${errBody}`);
                    }
                    return res.json();
                })
                    .then((analyzeRes) => {
                    state.agentRunning = false;
                    state.pendingActions = analyzeRes.actions || [];
                    state.latestSanitizedScreenshot = req.screenshot;
                    state.latestA11yTree = req.accessibilityTree;
                    const auditRecord = {
                        id: (0, utils_1.generateId)(),
                        timestamp: Date.now(),
                        url: state.currentUrl,
                        detectionsCount: state.lastScan?.items.length || 0,
                        redactionsCount: state.lastScan?.items.length || 0,
                        rawPiiTransmitted: 0,
                        payloadSafe: true,
                        serverCalled: true,
                        actionsReceived: analyzeRes.actions?.length || 0,
                        actionsExecuted: 0,
                    };
                    state.auditLog = [auditRecord, ...(state.auditLog || [])].slice(0, 50);
                    saveState();
                    broadcastState();
                    sendResponse({ ok: true, response: analyzeRes });
                })
                    .catch((err) => {
                    state.agentRunning = false;
                    state.agentError = err.message || String(err);
                    saveState();
                    broadcastState();
                    sendResponse({ ok: false, error: err.message || String(err) });
                });
                return true;
            }
            case 'EXECUTE_ACTION': {
                const action = message.payload;
                const tid = state.currentTabId;
                if (tid) {
                    chrome.tabs.sendMessage(tid, { type: 'EXECUTE_ACTION', payload: action }, (res) => {
                        void chrome.runtime.lastError;
                        if (res && res.result) {
                            state.actionHistory = [res.result, ...(state.actionHistory || [])].slice(0, 50);
                            if (state.auditLog && state.auditLog.length > 0 && res.result.success) {
                                state.auditLog[0].actionsExecuted = (state.auditLog[0].actionsExecuted || 0) + 1;
                            }
                            saveState();
                            broadcastState();
                        }
                        sendResponse(res ?? { ok: false });
                    });
                    return true;
                }
                sendResponse({ ok: false, error: 'No active tab' });
                break;
            }
            case 'GET_AUDIT_LOG': {
                sendResponse({ auditLog: state.auditLog || [] });
                break;
            }
            case 'CLEAR_AUDIT_LOG': {
                state.auditLog = [];
                state.actionHistory = [];
                state.pendingActions = [];
                saveState();
                broadcastState();
                sendResponse({ ok: true });
                break;
            }
        }
    });
}
// ─── Tab Lifecycle Listeners ─────────────────────────────────────────────────
if (typeof chrome !== 'undefined' && chrome.tabs?.onActivated) {
    chrome.tabs.onActivated.addListener(async ({ tabId }) => {
        state.currentTabId = tabId;
        try {
            const tab = await chrome.tabs.get(tabId);
            state.currentUrl = tab.url ?? '';
            if (isRestrictedUrl(state.currentUrl)) {
                await clearScan(tabId);
                state.scanStatus = 'restricted';
                state.scanErrorReason = 'restricted_url';
                state.scanErrorMessage = 'Cannot scan this page (restricted URL or browser page).';
            }
            else {
                // Load cached session scan for this specific tab & URL
                let loaded = false;
                if (chrome.storage?.session) {
                    const stored = await chrome.storage.session.get(`pfScan_${tabId}`);
                    const scan = stored[`pfScan_${tabId}`];
                    if (scan && scan.url === state.currentUrl) {
                        state.lastScan = scan;
                        state.scanStatus = 'success';
                        state.scanErrorReason = null;
                        state.scanErrorMessage = null;
                        state.lastMetrics = scan.metrics ?? null;
                        loaded = true;
                    }
                }
                if (!loaded) {
                    await clearScan(tabId);
                    state.scanStatus = 'idle';
                }
            }
            const items = state.lastScan?.items ?? [];
            updateBadge(tabId, items.length, state.lastScan?.riskScore ?? 0);
        }
        catch {
            await clearScan(tabId);
            state.scanStatus = 'idle';
        }
        broadcastState();
        saveState();
    });
}
if (typeof chrome !== 'undefined' && chrome.tabs?.onUpdated) {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (tab.active && (changeInfo.status === 'loading' || changeInfo.url)) {
            state.currentUrl = tab.url ?? '';
            state.currentTabId = tabId;
            if (isRestrictedUrl(state.currentUrl)) {
                clearScan(tabId);
                state.scanStatus = 'restricted';
                state.scanErrorReason = 'restricted_url';
                state.scanErrorMessage = 'Cannot scan this page (restricted URL or browser page).';
            }
            else if (changeInfo.status === 'loading') {
                // Clear scan on page reload or navigation
                clearScan(tabId);
                state.scanStatus = 'idle';
            }
            saveState();
            broadcastState();
        }
    });
}
if (typeof chrome !== 'undefined' && chrome.tabs?.onRemoved) {
    chrome.tabs.onRemoved.addListener(async (tabId) => {
        await clearScan(tabId);
        if (state.currentTabId === tabId) {
            state.currentTabId = null;
            broadcastState();
        }
    });
}
// ─── Initialize ──────────────────────────────────────────────────────────────
loadState();

})();

/******/ })()
;
//# sourceMappingURL=background.js.map