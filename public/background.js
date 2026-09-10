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
    PHONE: '[PHONE_NUMBER]',
    NAME: '[NAME]',
    ADDRESS: '[ADDRESS]',
    GOV_ID: '[GOV_ID]',
    AADHAAR: '[AADHAAR]',
    PAN: '[PAN]',
    IFSC: '[IFSC]',
    CARD: '[CREDIT_CARD]',
    FACE: '[FACE_REDACTED]',
    API_KEY: '[API_KEY]',
    GITHUB_TOKEN: '[GITHUB_TOKEN]',
    OPENAI_KEY: '[API_KEY]',
    ANTHROPIC_KEY: '[API_KEY]',
    GOOGLE_KEY: '[API_KEY]',
    JWT_SECRET: '[JWT]',
    MONGODB_URL: '[DATABASE_URL]',
    POSTGRES_URL: '[DATABASE_URL]',
    MYSQL_URL: '[DATABASE_URL]',
    REDIS_URL: '[DATABASE_URL]',
    AWS_KEY: '[API_KEY]',
    AZURE_KEY: '[API_KEY]',
    SUPABASE_KEY: '[API_KEY]',
    FIREBASE_CONFIG: '[API_KEY]',
    STRIPE_KEY: '[API_KEY]',
    RAZORPAY_KEY: '[API_KEY]',
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


/***/ },

/***/ 43
(__unused_webpack_module, exports) {

var __webpack_unused_export__;

/**
 * contextDetector.ts
 *
 * Centralized Multi-Signal Context Detector for Privacy Firewall / VeilAgent.
 *
 * Detects whether the current active browsing context is:
 *  - AUTHENTICATION (login, signup, password reset, MFA/OTP, account recovery)
 *  - MESSAGING (WhatsApp Web, Telegram, Discord, Slack, Teams, Messenger, Google Chat, generic chat)
 *  - NORMAL (safe for privacy-preserving local agent analysis)
 *  - UNKNOWN (fail-closed, restricted operations)
 *
 * Implements strict multi-signal confidence scoring to eliminate false positives
 * (e.g., single password field on settings page != auth page; contenteditable != messaging app).
 */
__webpack_unused_export__ = ({ value: true });
exports.defaultContextDetector = __webpack_unused_export__ = exports.AY = exports.y_ = exports.oD = void 0;
exports.oD = [
    {
        name: 'WhatsApp Web',
        domains: ['web.whatsapp.com'],
        context: 'MESSAGING',
    },
    {
        name: 'Telegram Web',
        domains: ['web.telegram.org'],
        context: 'MESSAGING',
    },
    {
        name: 'Discord',
        domains: ['discord.com', 'discordapp.com'],
        context: 'MESSAGING',
    },
    {
        name: 'Facebook Messenger',
        domains: ['messenger.com', 'www.messenger.com'],
        context: 'MESSAGING',
    },
    {
        name: 'Facebook Messenger',
        domains: ['facebook.com', 'web.facebook.com'],
        urlPatterns: [/\/messages/i],
        context: 'MESSAGING',
    },
    {
        name: 'Instagram Direct',
        domains: ['instagram.com', 'www.instagram.com'],
        urlPatterns: [/\/direct(\/|$)/i],
        context: 'MESSAGING',
    },
    {
        name: 'Slack',
        domains: ['slack.com', 'app.slack.com'],
        context: 'MESSAGING',
    },
    {
        name: 'Microsoft Teams',
        domains: ['teams.microsoft.com', 'teams.live.com'],
        context: 'MESSAGING',
    },
    {
        name: 'Google Chat',
        domains: ['chat.google.com'],
        context: 'MESSAGING',
    },
];
exports.y_ = [
    {
        name: 'ChatGPT',
        domains: ['chatgpt.com', 'chat.openai.com'],
        context: 'AI_ASSISTANT',
        composerSelectors: ['#prompt-textarea', 'div[contenteditable="true"]', 'textarea[data-id]'],
        sendButtonSelectors: ['button[data-testid="send-button"]', 'button[aria-label*="send" i]'],
    },
    {
        name: 'Claude',
        domains: ['claude.ai'],
        context: 'AI_ASSISTANT',
        composerSelectors: ['div[contenteditable="true"]', 'fieldset div[contenteditable]', 'textarea'],
        sendButtonSelectors: ['button[aria-label*="send" i]'],
    },
    {
        name: 'Gemini',
        domains: ['gemini.google.com'],
        context: 'AI_ASSISTANT',
        composerSelectors: ['div.rich-textarea', 'div[contenteditable="true"]', 'textarea'],
        sendButtonSelectors: ['button[aria-label*="send" i]', 'button.send-button'],
    },
    {
        name: 'Microsoft Copilot',
        domains: ['copilot.microsoft.com'],
        context: 'AI_ASSISTANT',
        composerSelectors: ['textarea', 'div[contenteditable="true"]'],
        sendButtonSelectors: ['button[aria-label*="submit" i]', 'button[aria-label*="send" i]'],
    },
    {
        name: 'Perplexity',
        domains: ['perplexity.ai', 'www.perplexity.ai'],
        context: 'AI_ASSISTANT',
        composerSelectors: ['textarea[placeholder*="ask" i]', 'textarea'],
        sendButtonSelectors: ['button[aria-label*="submit" i]', 'button[aria-label*="send" i]'],
    },
];
exports.AY = [
    {
        name: 'Facebook',
        domains: ['facebook.com', 'fb.com', 'm.facebook.com', 'web.facebook.com'],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'Instagram',
        domains: ['instagram.com', 'www.instagram.com', 'm.instagram.com'],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'X / Twitter',
        domains: ['x.com', 'twitter.com', 'mobile.twitter.com'],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'LinkedIn',
        domains: ['linkedin.com', 'www.linkedin.com', 'm.linkedin.com'],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'Reddit',
        domains: ['reddit.com', 'old.reddit.com', 'www.reddit.com', 'm.reddit.com'],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'TikTok',
        domains: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'Threads',
        domains: ['threads.net', 'www.threads.net'],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'Pinterest',
        domains: ['pinterest.com', 'www.pinterest.com'],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'Snapchat',
        domains: ['snapchat.com', 'www.snapchat.com', 'web.snapchat.com'],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'Bluesky',
        domains: ['bsky.app', 'main.bsky.app'],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'Mastodon',
        domains: ['mastodon.social'],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'Tumblr',
        domains: ['tumblr.com', 'www.tumblr.com'],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'Quora',
        domains: ['quora.com', 'www.quora.com'],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'YouTube',
        domains: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
        urlPatterns: [/\/community/i, /\/post\//i, /\/feed/i],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'Weibo',
        domains: ['weibo.com', 'www.weibo.com'],
        context: 'SOCIAL_MEDIA',
    },
    {
        name: 'VK',
        domains: ['vk.com', 'm.vk.com'],
        context: 'SOCIAL_MEDIA',
    },
];
// ─── Context Detector Class ───────────────────────────────────────────────────
class ContextDetector {
    constructor(messagingSignatures = exports.oD, socialMediaSignatures = exports.AY, aiSiteSignatures = exports.y_) {
        this.messagingSignatures = [...messagingSignatures];
        this.socialMediaSignatures = [...socialMediaSignatures];
        this.aiSiteSignatures = [...aiSiteSignatures];
    }
    /**
     * Register an additional messaging application signature dynamically.
     */
    registerMessagingApp(signature) {
        this.messagingSignatures.push(signature);
    }
    /**
     * Register an additional social media website application signature dynamically.
     */
    registerSocialMediaSite(signature) {
        this.socialMediaSignatures.push(signature);
    }
    getSocialMediaSignatures() {
        return [...this.socialMediaSignatures];
    }
    /**
     * Register an additional AI website application signature dynamically.
     */
    registerAiSite(signature) {
        this.aiSiteSignatures.push(signature);
    }
    getAiSignatures() {
        return [...this.aiSiteSignatures];
    }
    /**
     * Evaluates context from URL and optional DOM document.
     */
    detectContext(url, doc) {
        // 1. Check if environment or URL is completely missing/invalid
        if (!url && !doc && typeof window === 'undefined') {
            return {
                context: 'UNKNOWN',
                confidence: 0,
                signals: ['NO_URL_OR_DOC_AVAILABLE'],
            };
        }
        const targetDoc = doc !== undefined ? doc : (url && typeof window !== 'undefined' && url !== window.location.href ? undefined : (typeof document !== 'undefined' ? document : undefined));
        const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
        // 2. Evaluate Authentication Context (BLOCK_ALL)
        const authResult = this.evaluateAuthentication(targetUrl, targetDoc);
        if (authResult.isMatch) {
            return {
                context: 'AUTHENTICATION',
                confidence: authResult.confidence,
                signals: authResult.signals,
                scoreBreakdown: authResult.scores,
            };
        }
        // 3. Evaluate Messaging Context (BLOCK_ALL)
        const messagingResult = this.evaluateMessaging(targetUrl, targetDoc);
        if (messagingResult.isMatch) {
            return {
                context: 'MESSAGING',
                confidence: messagingResult.confidence,
                signals: messagingResult.signals,
                matchedDomain: messagingResult.matchedDomain,
                matchedApp: messagingResult.matchedApp,
                scoreBreakdown: messagingResult.scores,
            };
        }
        // 4. Evaluate Social Media Context (BLOCK_ALL)
        const socialResult = this.evaluateSocialMedia(targetUrl, targetDoc);
        if (socialResult.isMatch) {
            return {
                context: 'SOCIAL_MEDIA',
                confidence: socialResult.confidence,
                signals: socialResult.signals,
                matchedDomain: socialResult.matchedDomain,
                matchedApp: socialResult.matchedApp,
                scoreBreakdown: socialResult.scores,
            };
        }
        // 5. Evaluate AI Assistant Context (PRIVACY_SEND_GATE)
        const aiResult = this.evaluateAiAssistant(targetUrl, targetDoc);
        if (aiResult.isMatch) {
            return {
                context: 'AI_ASSISTANT',
                confidence: aiResult.confidence,
                signals: aiResult.signals,
                matchedDomain: aiResult.matchedDomain,
                matchedApp: aiResult.matchedApp,
                scoreBreakdown: aiResult.scores,
            };
        }
        // 5. If URL is invalid or malformed, fail closed to UNKNOWN
        if (targetUrl) {
            try {
                new URL(targetUrl);
            }
            catch {
                return {
                    context: 'UNKNOWN',
                    confidence: 0.5,
                    signals: ['MALFORMED_URL'],
                };
            }
        }
        else if (!targetDoc) {
            return {
                context: 'UNKNOWN',
                confidence: 0.5,
                signals: ['INDETERMINATE_PAGE_STATE'],
            };
        }
        // 5. Normal context
        return {
            context: 'NORMAL',
            confidence: 0.95,
            signals: ['NORMAL_WEB_PAGE'],
        };
    }
    // ─── Authentication Detection Multi-Signal Engine ───────────────────────────
    evaluateAuthentication(url, doc) {
        const signals = [];
        const scores = {};
        let totalScore = 0;
        let parsedUrl = null;
        try {
            if (url)
                parsedUrl = new URL(url);
        }
        catch {
            // Ignored
        }
        const path = parsedUrl ? parsedUrl.pathname.toLowerCase() : url.toLowerCase();
        const hostname = parsedUrl ? parsedUrl.hostname.toLowerCase() : '';
        const fullUrl = url.toLowerCase();
        // A1. Subdomain / Hostname Signals (login.*, signin.*, auth.*, accounts.*)
        const authHostPatterns = [
            { re: /^(login|signin|sign-in|auth|accounts|account|sso|identity|idp)\./i, label: 'HOST_AUTH_PRIMARY', score: 45 },
            { re: /\.(okta|auth0)\.com$/i, label: 'HOST_AUTH_IDP', score: 45 },
        ];
        for (const pat of authHostPatterns) {
            if (pat.re.test(hostname)) {
                signals.push(pat.label);
                scores[pat.label] = pat.score;
                totalScore += pat.score;
                break;
            }
        }
        // A2. URL Path & Query Signals
        const authUrlPatterns = [
            { re: /\/(login|signin|sign-in|sign_in|log_in)(\/|$|\.|\?)/i, label: 'URL_AUTH_LOGIN', score: 45 },
            { re: /\/(session\/new|users\/sign_in|identity\/login)(\/|$|\.|\?)/i, label: 'URL_AUTH_LOGIN', score: 45 },
            { re: /\/(signup|sign-up|register|registration|sign_up)(\/|$|\.|\?)/i, label: 'URL_AUTH_SIGNUP', score: 45 },
            { re: /\/(forgot[-_/]?password|reset[-_/]?password|password[-_/]?reset)(\/|$|\.|\?)/i, label: 'URL_PASSWORD_RESET', score: 45 },
            { re: /\/(account[-_/]?recovery|recover[-_/]?account|recovery)(\/|$|\.|\?)/i, label: 'URL_ACCOUNT_RECOVERY', score: 45 },
            { re: /\/(verify|verification|mfa|2fa|otp|challenge)(\/|$|\.|\?)/i, label: 'URL_MFA_OTP', score: 45 },
            { re: /\/(api[-_/]?keys|access[-_/]?tokens|developer[-_/]?keys|personal[-_/]?access[-_/]?tokens|credentials|manage[-_/]?keys|secrets)(\/|$|\.|\?)/i, label: 'URL_CREDENTIAL_MANAGEMENT', score: 45 },
            { re: /\/(auth|oauth|authenticate)(\/|$|\.|\?)/i, label: 'URL_AUTH_GENERIC', score: 30 },
        ];
        for (const pat of authUrlPatterns) {
            if (pat.re.test(path) || pat.re.test(fullUrl)) {
                signals.push(pat.label);
                scores[pat.label] = pat.score;
                totalScore += pat.score;
                break; // Count highest matching URL signal
            }
        }
        // A3. Query parameter indicators (e.g. ?login=true, ?redirect_to=login, ?mode=signin)
        if (parsedUrl && /[?&](login|signin|sign_in|mode=login|action=login)/i.test(parsedUrl.search)) {
            if (!signals.some(s => s.startsWith('URL_AUTH'))) {
                signals.push('URL_AUTH_QUERY');
                scores['URL_AUTH_QUERY'] = 30;
                totalScore += 30;
            }
        }
        // B. DOM Signals
        if (doc) {
            // 1. Password input detection
            const passwordInputs = doc.querySelectorAll('input[type="password"]');
            const hasPassword = passwordInputs.length > 0;
            if (hasPassword) {
                signals.push('DOM_PASSWORD_INPUT');
                scores['DOM_PASSWORD_INPUT'] = 25;
                totalScore += 25;
                if (passwordInputs.length >= 2) {
                    // Typically registration or password reset (new password + confirm password)
                    signals.push('DOM_MULTI_PASSWORD_INPUT');
                    scores['DOM_MULTI_PASSWORD_INPUT'] = 25;
                    totalScore += 25;
                }
            }
            // 2. Email / Username / Identifier input detection
            const emailOrUserInputs = doc.querySelectorAll('input[type="email"], input[autocomplete*="username" i], input[autocomplete*="email" i], input[name*="user" i], input[name*="email" i], input[id*="user" i], input[id*="email" i]');
            if (emailOrUserInputs.length > 0) {
                signals.push('DOM_EMAIL_USER_INPUT');
                scores['DOM_EMAIL_USER_INPUT'] = 20;
                totalScore += 20;
            }
            // 3. OTP / Verification code input
            const otpInputs = doc.querySelectorAll('input[name*="otp" i], input[autocomplete*="one-time-code" i], input[id*="otp" i], input[aria-label*="otp" i], input[placeholder*="otp" i], input[placeholder*="verification code" i], input[placeholder*="passcode" i]');
            if (otpInputs.length > 0) {
                signals.push('DOM_OTP_INPUT');
                scores['DOM_OTP_INPUT'] = 45;
                totalScore += 45;
            }
            // 4. Action Buttons (Sign In, Log In, Sign Up, Register, Verify, Reset)
            const buttons = Array.from(doc.querySelectorAll('button, input[type="submit"], a[role="button"]'));
            for (const btn of buttons) {
                const text = (btn.textContent || btn.value || '').trim().toLowerCase();
                const idOrClass = ((btn.id || '') + ' ' + (btn.className || '')).toLowerCase();
                if (/\b(sign\s*in|log\s*in|login|signin)\b/i.test(text) || /login|signin/i.test(idOrClass)) {
                    signals.push('DOM_LOGIN_BUTTON');
                    scores['DOM_LOGIN_BUTTON'] = 30;
                    totalScore += 30;
                    break;
                }
                if (/\b(sign\s*up|register|create\s*(an\s*)?account|join\s*now)\b/i.test(text) || /signup|register/i.test(idOrClass)) {
                    signals.push('DOM_SIGNUP_BUTTON');
                    scores['DOM_SIGNUP_BUTTON'] = 30;
                    totalScore += 30;
                    break;
                }
                if (/\b(reset\s*password|recover\s*account|send\s*otp|verify\s*otp|verify\s*code)\b/i.test(text)) {
                    signals.push('DOM_RESET_OR_VERIFY_BUTTON');
                    scores['DOM_RESET_OR_VERIFY_BUTTON'] = 35;
                    totalScore += 35;
                    break;
                }
            }
            // 5. Auth Headings / Page Title
            const headings = Array.from(doc.querySelectorAll('h1, h2, h3, [role="heading"], title'));
            for (const h of headings) {
                const text = (h.textContent || '').trim().toLowerCase();
                if (/\b(sign\s*in|log\s*in|welcome\s*back|create\s*(your\s*)?account|sign\s*up|reset\s*(your\s*)?password|forgot\s*password|two[- ]factor\s*authentication|2fa\s*verification|enter\s*verification\s*code|verify\s*your\s*identity|api\s*keys?|personal\s*access\s*tokens?|manage\s*credentials|api\s*tokens?)\b/i.test(text)) {
                    signals.push(`DOM_AUTH_HEADING: ${text.slice(0, 30)}`);
                    scores['DOM_AUTH_HEADING'] = 25;
                    totalScore += 25;
                    break;
                }
            }
            // 6. Form semantic attributes
            const authForms = doc.querySelectorAll('form[action*="login" i], form[action*="signin" i], form[action*="auth" i], form[id*="login" i], form[id*="signin" i], form[id*="signup" i], form[class*="login" i]');
            if (authForms.length > 0) {
                signals.push('DOM_AUTH_FORM_ATTRS');
                scores['DOM_AUTH_FORM_ATTRS'] = 20;
                totalScore += 20;
            }
        }
        // ─── Classification Decision ───
        const isStrongCombo = (signals.includes('DOM_PASSWORD_INPUT') &&
            signals.includes('DOM_EMAIL_USER_INPUT') &&
            (signals.includes('DOM_LOGIN_BUTTON') || signals.includes('DOM_SIGNUP_BUTTON'))) ||
            (signals.some((s) => s.startsWith('URL_')) && signals.includes('DOM_PASSWORD_INPUT')) ||
            (signals.includes('DOM_OTP_INPUT') &&
                (signals.some((s) => s.startsWith('URL_')) ||
                    signals.some((s) => s.startsWith('DOM_AUTH_HEADING')) ||
                    signals.includes('DOM_RESET_OR_VERIFY_BUTTON'))) ||
            (signals.includes('DOM_MULTI_PASSWORD_INPUT') &&
                (signals.includes('DOM_SIGNUP_BUTTON') ||
                    signals.includes('DOM_RESET_OR_VERIFY_BUTTON') ||
                    signals.some((s) => s.startsWith('DOM_AUTH_HEADING')))) ||
            signals.includes('URL_AUTH_LOGIN') ||
            signals.includes('URL_AUTH_SIGNUP') ||
            signals.includes('URL_PASSWORD_RESET') ||
            signals.includes('URL_ACCOUNT_RECOVERY') ||
            signals.includes('URL_MFA_OTP') ||
            signals.includes('HOST_AUTH_PRIMARY') ||
            signals.includes('HOST_AUTH_IDP');
        const hasAuthCredentialField = signals.includes('DOM_PASSWORD_INPUT') ||
            signals.includes('DOM_MULTI_PASSWORD_INPUT') ||
            signals.includes('DOM_OTP_INPUT');
        const hasAuthUrl = signals.some((s) => s.startsWith('URL_') || s.startsWith('HOST_AUTH'));
        const hasAuthHeadingOrAction = signals.some((s) => s.startsWith('DOM_AUTH_HEADING')) &&
            (signals.includes('DOM_RESET_OR_VERIFY_BUTTON') || signals.includes('DOM_LOGIN_BUTTON') || signals.includes('DOM_SIGNUP_BUTTON'));
        if (!hasAuthCredentialField && !hasAuthUrl && !hasAuthHeadingOrAction) {
            return {
                isMatch: false,
                confidence: 0,
                signals,
                scores,
            };
        }
        const isMatch = totalScore >= 55 || isStrongCombo;
        const confidence = isMatch ? Math.min(0.99, Math.max(0.7, totalScore / 100)) : 0;
        return {
            isMatch,
            confidence,
            signals,
            scores,
        };
    }
    // ─── Messaging Detection Multi-Signal Engine ────────────────────────────────
    evaluateMessaging(url, doc) {
        const signals = [];
        const scores = {};
        let totalScore = 0;
        let matchedDomain;
        let matchedApp;
        let parsedUrl = null;
        try {
            if (url)
                parsedUrl = new URL(url);
        }
        catch {
            // Ignored
        }
        const hostname = parsedUrl ? parsedUrl.hostname.toLowerCase() : '';
        const pathname = parsedUrl ? parsedUrl.pathname.toLowerCase() : url.toLowerCase();
        // A0. Supported AI websites are AI_ASSISTANT context, NOT messaging applications!
        for (const aiSite of this.aiSiteSignatures) {
            for (const domain of aiSite.domains) {
                if (hostname === domain || hostname.endsWith('.' + domain)) {
                    return {
                        isMatch: false,
                        confidence: 0,
                        signals: [],
                        scores: {},
                    };
                }
            }
        }
        // A. Known Application & Domain Signatures
        for (const app of this.messagingSignatures) {
            for (const domain of app.domains) {
                if (hostname === domain || hostname.endsWith('.' + domain)) {
                    // Check optional urlPatterns if specified
                    if (app.urlPatterns && app.urlPatterns.length > 0) {
                        const matchesPattern = app.urlPatterns.some((re) => re.test(pathname));
                        if (!matchesPattern)
                            continue;
                    }
                    matchedApp = app.name;
                    matchedDomain = domain;
                    signals.push(`KNOWN_MESSAGING_APP: ${app.name} (${domain})`);
                    scores['KNOWN_APP_DOMAIN'] = 90;
                    totalScore += 90;
                    break;
                }
            }
            if (matchedApp)
                break;
        }
        // B. URL Path Signals (supporting signals only)
        const chatUrlPattern = /\/(chat|messages|messaging|dm|direct|inbox|conversations)(\/|$|\?)/i;
        if (chatUrlPattern.test(pathname)) {
            signals.push('URL_MESSAGING_PATH');
            scores['URL_MESSAGING_PATH'] = 25;
            totalScore += 25;
        }
        // C. DOM / Application Signals
        let hasComposer = false;
        let hasThread = false;
        if (doc) {
            // 1. Message composer input
            const composerSelectors = [
                '[contenteditable="true"][aria-label*="message" i]',
                '[contenteditable="true"][data-placeholder*="message" i]',
                '[contenteditable="true"][role="textbox"]',
                'textarea[placeholder*="message" i]',
                'textarea[placeholder*="chat" i]',
                'textarea[aria-label*="message" i]',
                'textarea[id*="chat" i]',
                'textarea[name*="message" i]',
                'textarea[id*="message" i]',
                'input[placeholder*="message" i]',
                'input[placeholder*="chat" i]',
                'input[placeholder*="type a message" i]',
                'input[placeholder*="send a message" i]',
                'input[name*="message" i]',
                'input[id*="message" i]',
                'input[id*="chat" i]',
                '[data-testid*="chat-input" i]',
                'div[data-tab="10"]',
                'div[data-slate-editor="true"]', // Slack / Discord editor
            ];
            for (const sel of composerSelectors) {
                if (doc.querySelector(sel)) {
                    signals.push(`DOM_MESSAGE_COMPOSER: ${sel}`);
                    scores['DOM_MESSAGE_COMPOSER'] = 35;
                    totalScore += 35;
                    hasComposer = true;
                    break;
                }
            }
            // 2. Chat / Conversation log structures
            const threadSelectors = [
                '[role="log"]',
                '[aria-label*="messages" i]',
                '[aria-label*="chat" i]',
                '[data-testid*="conversation" i]',
                '[data-testid*="chat" i]',
                '[data-testid*="message-list" i]',
                '.messages-list',
                '.chat-messages',
                '.message-thread',
            ];
            hasThread = false;
            for (const sel of threadSelectors) {
                if (doc.querySelector(sel)) {
                    signals.push(`DOM_CONVERSATION_THREAD: ${sel}`);
                    scores['DOM_CONVERSATION_THREAD'] = 30;
                    totalScore += 30;
                    hasThread = true;
                    break;
                }
            }
            // 3. Message send button
            const sendButtons = Array.from(doc.querySelectorAll('button, [role="button"], input[type="submit"]'));
            for (const btn of sendButtons) {
                const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                const text = (btn.textContent || '').trim().toLowerCase();
                const testId = (btn.getAttribute('data-testid') || '').toLowerCase();
                const id = (btn.id || '').toLowerCase();
                const className = (btn.className || '').toLowerCase();
                if (aria === 'send' ||
                    aria === 'send message' ||
                    text === 'send' ||
                    text === 'send message' ||
                    id === 'send-btn' ||
                    id.includes('send-button') ||
                    className.includes('send-button') ||
                    testId.includes('send-button')) {
                    // If we also have composer or thread, give send button full credit
                    if (hasComposer || hasThread || matchedApp) {
                        signals.push('DOM_SEND_BUTTON');
                        scores['DOM_SEND_BUTTON'] = 20;
                        totalScore += 20;
                        break;
                    }
                }
            }
            // 4. Standalone generic contenteditable test
            // If a page ONLY has a generic contenteditable without composer context or chat containers,
            // we do NOT treat it as messaging.
            const genericContentEditable = doc.querySelector('[contenteditable="true"]');
            if (genericContentEditable && !hasComposer && !hasThread && !matchedApp) {
                signals.push('GENERIC_CONTENTEDITABLE_NON_CHAT');
                scores['GENERIC_CONTENTEDITABLE_NON_CHAT'] = 5;
                totalScore += 5;
            }
        }
        // ─── Classification Decision ───
        // Known messaging app domain -> Immediately classified as MESSAGING (score >= 90)
        // Generic chat DOM -> Requires composer + thread + send button or URL signal (score >= 60 or combo)
        const isComboMatch = (signals.includes('URL_MESSAGING_PATH') && (hasComposer || hasThread)) ||
            (hasComposer && hasThread) ||
            (hasComposer && signals.includes('DOM_SEND_BUTTON'));
        const isMatch = totalScore >= 60 || isComboMatch;
        const confidence = isMatch ? Math.min(0.99, Math.max(0.75, totalScore / 100)) : 0;
        return {
            isMatch,
            confidence,
            signals,
            matchedDomain,
            matchedApp,
            scores,
        };
    }
    // ─── Social Media Detection Multi-Signal Engine ───────────────────────────
    evaluateSocialMedia(url, doc) {
        const signals = [];
        const scores = {};
        let totalScore = 0;
        let matchedDomain;
        let matchedApp;
        let parsedUrl = null;
        try {
            if (url)
                parsedUrl = new URL(url);
        }
        catch {
            // Ignored
        }
        const hostname = parsedUrl ? parsedUrl.hostname.toLowerCase() : '';
        const pathname = parsedUrl ? parsedUrl.pathname.toLowerCase() : url.toLowerCase();
        // A. Known Application & Domain Signatures
        for (const site of this.socialMediaSignatures) {
            for (const domain of site.domains) {
                if (hostname === domain || hostname.endsWith('.' + domain)) {
                    if (site.urlPatterns && site.urlPatterns.length > 0) {
                        const matchesPattern = site.urlPatterns.some((re) => re.test(pathname));
                        if (!matchesPattern)
                            continue;
                    }
                    matchedApp = site.name;
                    matchedDomain = domain;
                    signals.push(`KNOWN_SOCIAL_MEDIA: ${site.name} (${domain})`);
                    scores['KNOWN_SOCIAL_MEDIA_DOMAIN'] = 95;
                    totalScore += 95;
                    break;
                }
            }
            if (matchedApp)
                break;
        }
        // B. Generic Feed / Timeline DOM Signals
        if (doc) {
            let domScore = 0;
            if (doc.querySelector('div[role="feed"], [aria-label*="timeline" i], [aria-label*="feed" i]')) {
                signals.push('DOM_SOCIAL_FEED_CONTAINER');
                domScore += 35;
            }
            if (doc.querySelector('[data-testid*="tweet" i], [data-testid*="post" i], article[data-testid*="tweet" i]')) {
                signals.push('DOM_SOCIAL_POST_ITEM');
                domScore += 35;
            }
            if (doc.querySelector('[data-testid*="retweet" i], [data-testid*="like" i], button[aria-label*="repost" i], button[aria-label*="retweet" i]')) {
                signals.push('DOM_SOCIAL_INTERACTION_BTN');
                domScore += 20;
            }
            if (domScore > 0) {
                scores['DOM_SOCIAL_FEED'] = domScore;
                totalScore += domScore;
            }
        }
        // C. Generic URL Feed / Timeline Indicators
        if (pathname && /\/(feed|timeline|stream|posts|wall)(\/|$)/i.test(pathname)) {
            signals.push('URL_SOCIAL_FEED_PATH');
            scores['URL_SOCIAL_FEED_PATH'] = 20;
            totalScore += 20;
        }
        const isMatch = totalScore >= 60;
        const confidence = isMatch ? Math.min(0.99, Math.max(0.85, totalScore / 100)) : 0;
        return {
            isMatch,
            confidence,
            signals,
            matchedDomain,
            matchedApp,
            scores,
        };
    }
    // ─── AI Assistant Detection Multi-Signal Engine ──────────────────────────
    evaluateAiAssistant(url, doc) {
        const signals = [];
        const scores = {};
        let totalScore = 0;
        let matchedDomain;
        let matchedApp;
        let parsedUrl = null;
        try {
            if (url)
                parsedUrl = new URL(url);
        }
        catch {
            // url might be partial
        }
        const hostname = parsedUrl ? parsedUrl.hostname.toLowerCase() : '';
        const fullUrl = url.toLowerCase();
        // 1. Domain & URL pattern evaluation from configurable signatures
        for (const app of this.aiSiteSignatures) {
            const domainMatch = app.domains.some((d) => hostname === d || hostname.endsWith(`.${d}`) || fullUrl.includes(d));
            if (domainMatch) {
                if (!app.urlPatterns || app.urlPatterns.length === 0) {
                    const sig = `AI_DOMAIN_${app.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
                    signals.push(sig);
                    scores[sig] = 85;
                    totalScore += 85;
                    matchedDomain = hostname || app.domains[0];
                    matchedApp = app.name;
                    break;
                }
                else {
                    const path = parsedUrl ? parsedUrl.pathname : url;
                    const matchesPattern = app.urlPatterns.some((pat) => pat.test(path));
                    if (matchesPattern) {
                        const sig = `AI_DOMAIN_PATTERN_${app.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
                        signals.push(sig);
                        scores[sig] = 85;
                        totalScore += 85;
                        matchedDomain = hostname || app.domains[0];
                        matchedApp = app.name;
                        break;
                    }
                }
            }
        }
        // 2. DOM Signals: AI composer & prompt structures
        if (doc) {
            const composerSelectors = [
                '#prompt-textarea',
                'div.rich-textarea',
                'textarea[data-id]',
                'textarea[placeholder*="ask" i]',
                'textarea[placeholder*="message" i]',
                'textarea[placeholder*="prompt" i]',
                'div[contenteditable="true"][data-placeholder*="ask" i]',
                'div[contenteditable="true"][data-placeholder*="message" i]',
                'div[contenteditable="true"][data-placeholder*="prompt" i]',
                'div[contenteditable="true"][role="textbox"]',
                'div[contenteditable="true"]',
                'textarea',
            ];
            let hasAiComposer = false;
            for (const sel of composerSelectors) {
                try {
                    if (doc.querySelector(sel)) {
                        hasAiComposer = true;
                        break;
                    }
                }
                catch { }
            }
            if (hasAiComposer) {
                signals.push('DOM_AI_COMPOSER');
                scores['DOM_AI_COMPOSER'] = 35;
                totalScore += 35;
            }
            const sendButtonSelectors = [
                'button[data-testid="send-button"]',
                'button[aria-label*="send prompt" i]',
                'button[aria-label*="send message" i]',
                'button[aria-label*="send" i]',
                'button.send-button',
            ];
            let hasAiSendButton = false;
            for (const sel of sendButtonSelectors) {
                try {
                    if (doc.querySelector(sel)) {
                        hasAiSendButton = true;
                        break;
                    }
                }
                catch { }
            }
            if (hasAiSendButton) {
                signals.push('DOM_AI_SEND_BUTTON');
                scores['DOM_AI_SEND_BUTTON'] = 30;
                totalScore += 30;
            }
        }
        // Match criteria: Known AI domain or signature (score >= 60)
        const isMatch = totalScore >= 60;
        const confidence = isMatch ? Math.min(0.99, Math.max(0.75, totalScore / 100)) : 0;
        return {
            isMatch,
            confidence,
            signals,
            matchedDomain,
            matchedApp,
            scores,
        };
    }
}
__webpack_unused_export__ = ContextDetector;
exports.defaultContextDetector = new ContextDetector();


/***/ },

/***/ 229
(__unused_webpack_module, exports, __webpack_require__) {

var __webpack_unused_export__;

/**
 * contextPolicyEngine.ts
 *
 * Centralized Context Policy Engine for Privacy Firewall / VeilAgent.
 *
 * Translates page context classification (AUTHENTICATION, MESSAGING, UNKNOWN, NORMAL)
 * into deterministic fail-closed policy enforcement decisions.
 *
 * Enforces the core invariant:
 * "Authentication pages and messaging applications are agent-excluded contexts.
 *  No screenshot, DOM, OCR, NER result, message content, credential, or other page
 *  information from these contexts may be transmitted to the agent backend, and no
 *  agent-generated action may execute within them."
 */
__webpack_unused_export__ = ({ value: true });
exports.evaluatePageContext = exports.TF = __webpack_unused_export__ = void 0;
const contextDetector_1 = __webpack_require__(43);
class ContextPolicyEngine {
    constructor(detector = contextDetector_1.defaultContextDetector) {
        this.detector = detector;
    }
    /**
     * Evaluates the active page context and returns the binding security policy.
     */
    evaluateContext(url, doc) {
        const detection = this.detector.detectContext(url, doc);
        switch (detection.context) {
            case 'AUTHENTICATION':
                return {
                    context: 'AUTHENTICATION',
                    policy: 'BLOCK_ALL',
                    reason: 'AUTHENTICATION_CONTEXT',
                    allowScreenshot: false,
                    allowDomTransmission: false,
                    allowOCRTransmission: false,
                    allowAgentActions: false,
                    allowCredentialResolution: false,
                    confidence: detection.confidence,
                    details: {
                        signals: detection.signals,
                    },
                };
            case 'MESSAGING':
                return {
                    context: 'MESSAGING',
                    policy: 'BLOCK_ALL',
                    reason: 'MESSAGING_CONTEXT',
                    allowScreenshot: false,
                    allowDomTransmission: false,
                    allowOCRTransmission: false,
                    allowAgentActions: false,
                    allowCredentialResolution: false,
                    confidence: detection.confidence,
                    details: {
                        signals: detection.signals,
                        matchedDomain: detection.matchedDomain,
                        matchedApp: detection.matchedApp,
                    },
                };
            case 'SOCIAL_MEDIA':
                return {
                    context: 'SOCIAL_MEDIA',
                    policy: 'BLOCK_ALL',
                    reason: 'SOCIAL_MEDIA_CONTEXT',
                    allowScreenshot: false,
                    allowDomTransmission: false,
                    allowOCRTransmission: false,
                    allowAgentActions: false,
                    allowCredentialResolution: false,
                    confidence: detection.confidence,
                    details: {
                        signals: detection.signals,
                        matchedDomain: detection.matchedDomain,
                        matchedApp: detection.matchedApp,
                    },
                };
            case 'AI_ASSISTANT':
                return {
                    context: 'AI_ASSISTANT',
                    policy: 'PRIVACY_SEND_GATE',
                    reason: 'AI_ASSISTANT_CONTEXT',
                    allowScreenshot: false,
                    allowDomTransmission: false,
                    allowOCRTransmission: false,
                    allowAgentActions: false,
                    allowCredentialResolution: false,
                    confidence: detection.confidence,
                    details: {
                        signals: detection.signals,
                        matchedDomain: detection.matchedDomain,
                        matchedApp: detection.matchedApp,
                    },
                };
            case 'UNKNOWN':
                // Strict fail-closed: If context cannot be established, restrict operations
                return {
                    context: 'UNKNOWN',
                    policy: 'RESTRICTED',
                    reason: 'UNKNOWN_CONTEXT_FAIL_CLOSED',
                    allowScreenshot: false,
                    allowDomTransmission: false,
                    allowOCRTransmission: false,
                    allowAgentActions: false,
                    allowCredentialResolution: false,
                    confidence: detection.confidence,
                    details: {
                        signals: detection.signals,
                    },
                };
            case 'NORMAL':
            default:
                return {
                    context: 'NORMAL',
                    policy: 'ALLOW_PRIVACY_PIPELINE',
                    reason: 'NORMAL_PAGE_CONTEXT',
                    allowScreenshot: true,
                    allowDomTransmission: true,
                    allowOCRTransmission: true,
                    allowAgentActions: true,
                    allowCredentialResolution: true,
                    confidence: detection.confidence,
                    details: {
                        signals: detection.signals,
                    },
                };
        }
    }
    /**
     * Convenience helper to check if agent operations are completely blocked.
     */
    isAgentBlocked(url, doc) {
        const policy = this.evaluateContext(url, doc);
        return policy.policy === 'BLOCK_ALL' || !policy.allowAgentActions;
    }
}
__webpack_unused_export__ = ContextPolicyEngine;
exports.TF = new ContextPolicyEngine();
/**
 * Top-level convenience evaluation function.
 */
function evaluatePageContext(url, doc) {
    return exports.TF.evaluateContext(url, doc);
}
exports.evaluatePageContext = evaluatePageContext;


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
const contextPolicyEngine_1 = __webpack_require__(229);
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
    agentProgress: null,
    pageContext: 'NORMAL',
    contextPolicy: undefined,
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
    const contextPolicy = state.contextPolicy || (0, contextPolicyEngine_1.evaluatePageContext)(tabUrl);
    if (contextPolicy.policy === 'BLOCK_ALL' || state.pageContext === 'AUTHENTICATION' || state.pageContext === 'MESSAGING') {
        clearScan(tabId);
        state.scanStatus = 'blocked';
        state.scanErrorReason = 'context_blocked';
        state.scanErrorMessage = `Page is in ${state.pageContext || contextPolicy.context} context. Agent scanning and capabilities are completely disabled.`;
        saveState();
        broadcastState();
        sendResponse?.({ ok: false, error: 'Context blocked' });
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
            case 'CONTEXT_BLOCKED': {
                const payload = message.payload;
                state.pageContext = payload.context;
                const currentPolicy = (0, contextPolicyEngine_1.evaluatePageContext)(payload.url || state.currentUrl);
                state.contextPolicy = currentPolicy;
                const auditRecord = {
                    id: (0, utils_1.generateId)(),
                    timestamp: Date.now(),
                    url: payload.url || state.currentUrl,
                    detectionsCount: 0,
                    redactionsCount: 0,
                    rawPiiTransmitted: 0,
                    payloadSafe: false,
                    serverCalled: false,
                    actionsReceived: 0,
                    actionsExecuted: 0,
                    event: 'CONTEXT_BLOCKED',
                    context: payload.context,
                    reason: payload.reason,
                };
                state.auditLog = [auditRecord, ...(state.auditLog || [])].slice(0, 50);
                saveState();
                broadcastState();
                sendResponse({ ok: true });
                break;
            }
            case 'CONTEXT_UPDATE': {
                const payload = message.payload;
                state.pageContext = payload.context;
                state.contextPolicy = payload.policy;
                if (payload.url)
                    state.currentUrl = payload.url;
                if (payload.context === 'AUTHENTICATION' || payload.context === 'MESSAGING') {
                    clearScan(state.currentTabId);
                    state.scanStatus = 'blocked';
                    state.scanErrorReason = 'context_blocked';
                    state.scanErrorMessage = `${payload.context} context: Agent capabilities and page scanning are completely disabled.`;
                    if (state.currentTabId && typeof chrome !== 'undefined' && chrome.action?.setBadgeText) {
                        try {
                            chrome.action.setBadgeText({ text: 'STOP', tabId: state.currentTabId });
                            chrome.action.setBadgeBackgroundColor({ color: '#B91C1C', tabId: state.currentTabId });
                        }
                        catch { }
                    }
                }
                saveState();
                broadcastState();
                sendResponse({ ok: true });
                break;
            }
            case 'AI_SEND_GATE_EVENT': {
                const payload = message.payload;
                const auditRecord = {
                    id: (0, utils_1.generateId)(),
                    timestamp: Date.now(),
                    url: payload.url || state.currentUrl,
                    detectionsCount: payload.detectionsCount || 0,
                    redactionsCount: payload.redactionsCount || 0,
                    rawPiiTransmitted: 0,
                    payloadSafe: payload.event === 'AI_SEND_ALLOWED',
                    serverCalled: false,
                    actionsReceived: 0,
                    actionsExecuted: 0,
                    event: payload.event,
                    context: 'AI_ASSISTANT',
                    reason: payload.reason,
                };
                state.auditLog = [auditRecord, ...(state.auditLog || [])].slice(0, 50);
                saveState();
                broadcastState();
                sendResponse({ ok: true });
                break;
            }
            case 'ANALYZE_PAGE': {
                const req = message.payload;
                const currentPolicy = (0, contextPolicyEngine_1.evaluatePageContext)(req.url || state.currentUrl);
                if (req.context === 'AUTHENTICATION' ||
                    req.context === 'MESSAGING' ||
                    state.pageContext === 'AUTHENTICATION' ||
                    state.pageContext === 'MESSAGING' ||
                    !currentPolicy.allowDomTransmission ||
                    currentPolicy.policy === 'BLOCK_ALL') {
                    state.agentRunning = false;
                    state.agentError = `BLOCKED: Agent processing is disabled on ${currentPolicy.context || req.context} pages.`;
                    broadcastState();
                    sendResponse({
                        ok: false,
                        error: `POLICY_VIOLATION: Context '${currentPolicy.context || req.context}' is blocked from agent processing.`,
                    });
                    return true;
                }
                state.agentRunning = true;
                state.agentError = null;
                broadcastState();
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
                state.agentProgress = null;
                saveState();
                broadcastState();
                sendResponse({ ok: true });
                break;
            }
            case 'AGENT_PROGRESS': {
                state.agentProgress = message.payload;
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
            const contextPolicy = (0, contextPolicyEngine_1.evaluatePageContext)(state.currentUrl);
            state.pageContext = contextPolicy.context;
            state.contextPolicy = contextPolicy;
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
            const contextPolicy = (0, contextPolicyEngine_1.evaluatePageContext)(state.currentUrl);
            state.pageContext = contextPolicy.context;
            state.contextPolicy = contextPolicy;
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