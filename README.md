# Privacy-Preserving Browser Vision Agent (Smart India Hackathon)

> **A local-first Chrome extension that sanitizes sensitive data before vision-agent transmission.**

---

## 1. System Overview

Privacy-Preserving Browser Vision Agent is a Chrome Manifest V3 extension that detects and sanitizes sensitive information locally before page information is transmitted to an agent backend.

The browser combines DOM analysis, pattern-based PII and secret detection, local OCR, visual-region processing, semantic redaction, and fail-closed policy validation.

Only sanitized screenshots and structural metadata are transmitted to the backend.

The backend returns strictly validated browser actions using symbolic references such as `LOCAL_EMAIL` and `LOCAL_PASSWORD`. These references are resolved exclusively inside the browser, so the backend never receives the underlying credentials.

---

## 2. Agent Engine Status

- **Current verified agent engine:**
  **Deterministic structured action planner.**
  The server actively parses sanitized accessibility trees, form controls, and task goals to deterministically synthesize safe browser actions using symbolic references.

- **Optional neural VLM:**
  **The architecture supports integration of local open-source vision-language models such as Qwen2.5-VL-class models when compatible model weights and hardware are available.**
  The FastAPI backend includes hardware detection and adapter interfaces to host local VLMs (e.g. Qwen2.5-VL-3B-Instruct) when dedicated GPU resources are available.

*(Note: The deterministic structured planner is an algorithmic rule-based synthesizer and is not a neural VLM.)*

---

## 3. Quick Start & Setup

### Prerequisites
- Node.js v18+ and npm
- Python 3.10+ (Python 3.12 or 3.13 recommended)
- Google Chrome (Latest stable release)

### Installation & Build

```bash
# 1. Install frontend dependencies
npm install

# 2. Build the extension bundle and React popup
npm run build:all

# 3. Set up Python virtual environment and install backend dependencies
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate
pip install -r server/requirements.txt
```

### Loading the Extension in Google Chrome
1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the upper right.
3. Click **Load unpacked**.
4. Select the `./build/` folder from this repository.
5. Verify the extension appears as **"Privacy Firewall" (v1.0.0)**.

### Running the Local Agent Backend
```bash
python server/main.py
```
The server starts at `http://127.0.0.1:8000`. Test readiness at `http://127.0.0.1:8000/health`.

### Running the Demonstration Page
Open `./build/test.html` directly in Chrome, or serve via:
```bash
npx serve build
```
and navigate to `http://localhost:3000/test.html`.

---

## 4. Architecture Pipeline

```
                     ACTIVE TAB
                         │
                         ▼
                CONTEXT DETECTOR
                         │
              ┌───────────┼───────────┬───────────┐
              ▼           ▼           ▼           ▼
        AUTHENTICATION  MESSAGING   SOCIAL MEDIA  NORMAL / UNKNOWN
              │           │           │           │
              ▼           ▼           ▼           ▼
          BLOCK ALL   BLOCK ALL   BLOCK ALL   CONTEXT POLICY ENGINE
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
             NORMAL                                   UNKNOWN
                 │                                       │
                 ▼                                       ▼
         PRIVACY PIPELINE                           RESTRICTED
                 │                                (Fail-Closed)
                 ▼
          LOCAL DETECTION
           ├── DOM Scanner
           ├── Regex (Aadhaar, PAN, Cards, Secrets)
           ├── NER (Quantized ONNX BERT)
           ├── OCR (Client-side Tesseract worker)
           └── Face Detection
                 │
                 ▼
          HYBRID FUSION (IoU Spatial Clustering)
                 │
                 ▼
          SEMANTIC REDACTION (Context-Preserving Placeholders)
                 │
                 ▼
          SCREENSHOT PIXEL REDACTION (Canvas Blackout)
                 │
                 ▼
          FAIL-CLOSED POLICY VALIDATION (validatePayloadBeforeTransmission)
                 │
                 ▼
          SANITIZED PAYLOAD
                 │
                 ▼
          FASTAPI BACKEND
                 │
                 ▼
          AGENT ENGINE (Deterministic Structured Planner)
                 │
                 ▼
          ACTION VALIDATOR (Disallows malicious selectors / code injection)
                 │
                 ▼
          RE-CHECK CONTEXT
                 │
                 ▼
          ACTION EXECUTOR (Symbolic Token Resolution + Native Dispatch)
                 │
                 ▼
          LOCAL AUDIT LOG (Immutable Record in chrome.storage.local)
```

---

## 4.1. Context-Based Agent Blocking (Authentication, Messaging & Social Media)

The extension enforces strict agent exclusion for **Authentication Contexts**, **Messaging Applications**, and **Social Media Websites**:

### Invariant
> **Authentication pages, messaging applications, and social media platforms are agent-excluded contexts.** No screenshot, DOM, OCR, NER result, message content, feed, post, comment, credential, or other page information from these contexts may be transmitted to the agent backend, and no agent-generated action may execute within them.

### Detected Contexts:
1. **Authentication Contexts (`BLOCK_ALL`):**
   - Login, Sign in, Sign up, Registration, Create Account, Password Reset, Forgot Password, Account Recovery, MFA / 2FA / OTP Verification.
   - Multi-signal scoring combining URL paths, password/email inputs, submit buttons, OTP fields, and auth headings (prevents false positives on single password fields).
2. **Messaging Applications (`BLOCK_ALL`):**
   - WhatsApp Web, Telegram Web, Discord, Slack, Microsoft Teams, Facebook Messenger, Google Chat, and generic chat DOM structures.
   - Multi-signal confidence engine combining configurable application signatures, message composers, chat threads, and send buttons (prevents false positives on generic contenteditable or comment forms).
3. **Social Media Websites (`BLOCK_ALL`):**
   - Facebook, Instagram, X (Twitter), LinkedIn, Reddit, TikTok, Threads, Pinterest, Snapchat, Bluesky, Mastodon, Tumblr, Quora, YouTube community/posts, Weibo, VK, and generic timeline/feed DOM structures.
   - Multi-signal confidence engine combining domain signatures, feed roles (`div[role="feed"]`), and post containers. Agent actions, data harvesting, and planner executions are completely prohibited.
4. **AI Assistant Websites (`PRIVACY_SEND_GATE`):**
   - ChatGPT, Claude, Gemini, Microsoft Copilot, Perplexity, and configurable AI assistants.
   - Enforces the **AI Send-Button Privacy Gate**: prevents submission until sensitive data is sanitized, semantic placeholders are applied, and content hash verification passes.
5. **Unknown Contexts (`RESTRICTED`):**
   - Fail-closed default: if context classification cannot be established, data transmission is prohibited.
6. **Normal Webpages (`ALLOW_PRIVACY_PIPELINE`):**
   - Enters the full local redaction and privacy preservation pipeline. Normal websites (Google Search, GitHub, Stack Overflow, Wikipedia) are completely unhindered.

---

## 4.2. AI Website Send-Button Privacy Gate

On supported AI websites (ChatGPT, Claude, Gemini, Copilot, Perplexity, and custom registered AI assistants), users often paste sensitive environment variables, secrets, credentials, and PII into prompt input boxes. The extension enforces an automated client-side privacy gate directly in the page DOM:

### Invariant
> **On AI websites, outgoing prompt submissions are blocked until privacy sanitization has completed, all detected sensitive tokens are replaced with approved semantic placeholders, and the sanitized content is cryptographically verified.**

### Gate State Machine (8 States)
```
[AI_SITE_DETECTED] ──► [ANALYZING] ──► [SENSITIVE_DATA_FOUND] ──► [REDACTING]
                            │                                           │
                            ▼ (No sensitive data)                       ▼
                         [READY] ◄──────── [VERIFIED] ◄── [PLACEHOLDERS_UPDATED]
                            │
                      (User edits prompt)
                            │
                            ▼
                       [ANALYZING] (Verification invalidated, send locked)
```

1. **`AI_SITE_DETECTED`**: Initial state upon detecting supported AI assistant website.
2. **`ANALYZING`**: Scanning prompt input for secrets, API keys, passwords, credentials, tokens, PII.
3. **`SENSITIVE_DATA_FOUND`**: Sensitive values identified; send button locked down.
4. **`REDACTING`**: Applying approved semantic placeholders (e.g., `YOUR_GOOGLE_MAPS_API_KEY`).
5. **`PLACEHOLDERS_UPDATED`**: Placeholders populated into composer with DOM input events dispatched.
6. **`VERIFIED`**: Full scan re-run on outgoing content confirming no raw secrets remain; content hash recorded.
7. **`READY`**: Gate unlocked; send button enabled.
8. **`ERROR`**: Fail-closed state if redaction or verification encounters an exception.

### Comprehensive Submission Interception
Disabling the DOM button is treated strictly as visual affordance. True security enforcement relies on **capture-phase event listeners** on the window/document:
- **Button Clicks**: Capture-phase `click` interception on send buttons calling `preventDefault()` and `stopImmediatePropagation()`.
- **Keyboard Shortcuts**: Capture-phase `keydown` interception blocking `Enter`, `Cmd+Enter`, and `Ctrl+Enter` whenever `state !== 'READY'`.
- **Form Submission**: Capture-phase `submit` listener preventing default form dispatch.
- **Content-Hash Lock**: Content hash (`SHA-256` or fallback) tracks verified content. Any subsequent keystroke or paste immediately invalidates verification and re-locks submission until re-verified.

---

## 5. Semantic Placeholder Standard

To prevent breaking layout comprehension or schema understanding for vision and language models, raw sensitive credentials are substituted with context-preserving semantic placeholders:

| Sensitive Category | Raw Input (Browser Only) | Transmitted Placeholder |
|---|---|---|
| **Google Maps API Key** | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...` | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY` |
| **Supabase URL** | `NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL` |
| **Supabase Anon Key** | `NEXT_PUBLIC_SUPABASE_ANON_KEY=sbp_9876...` | `NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY` |
| **Service Role Secret** | `SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...` | `SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY` |
| **Stripe Secret Key** | `STRIPE_SECRET_KEY=sk_test_51Abcdef...` | `STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY` |
| **PostgreSQL Database** | `DATABASE_URL=postgresql://user:pass@host/db` | `DATABASE_URL=YOUR_DATABASE_URL` |
| **Custom Application Key** | `MY_API_KEY=secret_token_123` | `MY_API_KEY=YOUR_MY_API_KEY` |
| **Standalone JWT** | `eyJhbGciOiJIUzI1Ni...` | `YOUR_JWT_TOKEN` |
| **User Email** | `rajesh.kumar@gov.in` | `EMAIL=YOUR_EMAIL` |
| **User Password** | `My$ecureP@ss2026!` | `PASSWORD=YOUR_PASSWORD` |
| **Safe Endpoint Config** | `NEXT_PUBLIC_API_URL=http://localhost:5000` | `NEXT_PUBLIC_API_URL=http://localhost:5000` *(Unchanged)* |

---

## 6. Action Execution & Security Controls

When interacting with form fields, the agent backend returns actions referencing symbolic handles:
```json
{
  "action": "type",
  "selector": "#password",
  "valueRef": "LOCAL_PASSWORD",
  "requiresConfirmation": true
}
```

- **Symbolic Resolution**: The client-side `ActionExecutor` resolves `LOCAL_PASSWORD`, `LOCAL_EMAIL`, `LOCAL_AADHAAR`, and `LOCAL_PAN` from `chrome.storage.local` within the active tab context. The server never handles raw user credentials.
- **In-DOM User Confirmation**: Actions flagged with `requiresConfirmation: true` (passwords, submit buttons, payment actions) summon an accessible in-DOM dialog requiring explicit user click before DOM event dispatch.
- **Selector Sanitization**: Rejects `javascript:`, `eval()`, script tags, and event handler injections.

---

## 7. Verified Test Status

### Frontend Test Suite (Jest / JSDOM)
- **Status**: **12 test suites passed, 116 tests passed, 0 failed**
- **Command**: `npm test -- --watchAll=false`
- **Coverage**: Official SIH evaluation benchmark, semantic placeholders, Verhoeff Aadhaar, Luhn card check, PAN validation, XSS prevention, selector sanitization, fail-closed policy, and canvas redaction.

### Backend Test Suite (Pytest)
- **Status**: **5 tests passed, 0 failed**
- **Command**: `python -m pytest server/tests`
- **Coverage**: Health check, valid sanitized planning, raw PII rejection (HTTP 422), malicious selector rejection, and DOM/OCR leakage checks.

### Build Verification
- **Status**: Clean compilation via `npm run build:all`.

---

## 8. Measured Performance Summary

Captured in live Google Chrome with unpacked extension active (`measured_benchmarks.json` across 30 iterations):

| Pipeline Stage | p50 (Median) | p95 |
|---|:---:|:---:|
| **Tab Screenshot Capture** (`captureVisibleTab`) | 71.26 ms | 92.85 ms |
| **Live DOM Privacy Detection** | 0.00 ms | 0.10 ms |
| **Screenshot Canvas Redaction** | 6.50 ms | 8.70 ms |
| **Fail-Closed Policy Pre-Flight Check** | 0.00 ms | 0.10 ms |
| **Local Network Roundtrip to FastAPI** | 3.50 ms | 5.30 ms |
| **Action Planner Synthesis (Deterministic)** | 1.07 ms | 13.34 ms |
| **Core Measured Roundtrip** | **~85 ms** | **~125 ms** |

*(Heavy worker operations such as full-page Tesseract OCR ~400–1200 ms and neural VLM inference ~800–2500 ms are estimated hardware-dependent components).*

---

## 9. Feature Implementation Status

| Feature / Subsystem | Status | Description |
|---|:---:|---|
| **Local PII & Secret Scanner** | **VERIFIED** | DOM inspection, regex patterns, Verhoeff Aadhaar, Luhn credit cards. |
| **Semantic Placeholder Engine** | **VERIFIED** | Context-preserving substitutions for API keys, URLs, emails, passwords. |
| **Screenshot Canvas Redaction** | **VERIFIED** | Solid `#050505` blackout boxes with post-redaction luminance checking. |
| **Fail-Closed Policy Gate** | **VERIFIED** | Blocks payload transmission with `POLICY_VIOLATION` if unverified. |
| **FastAPI Backend & Security Guard** | **VERIFIED** | Rejects unredacted payloads with HTTP 422 `POLICY_VIOLATION`. |
| **Deterministic Action Planner** | **VERIFIED** | Active server planning engine emitting structured symbolic actions. |
| **Symbolic Token Resolution** | **VERIFIED** | Resolves `LOCAL_*` tokens in browser context without server transmission. |
| **User Confirmation Modal** | **VERIFIED** | Halts high-risk actions pending explicit user authorization. |
| **Local Immutable Audit Log** | **VERIFIED** | Logs scan metrics and confirms zero raw PII transmission. |
| **Local ONNX NER & Face Detection** | **PARTIALLY VERIFIED** | Integrated with CPU/WASM fallback in browser worker architecture. |
| **Client-Side Worker OCR** | **PARTIALLY VERIFIED** | Tesseract.js worker active; performance is hardware-dependent. |
| **Local Neural Vision-Language Model** | **NOT CURRENTLY ACTIVE** | Architected with runtime fallback; deterministic engine active by default. |
| **Cloud Telemetry & Sync** | **PLANNED / OPTIONAL** | Out of scope for local privacy-preserving hackathon evaluation. |

---

## 10. Documentation Index

- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed subsystem breakdown, dataflows, and VLM engine specifications.
- [PRIVACY_MODEL.md](PRIVACY_MODEL.md) - Fail-closed privacy invariants, protected categories, and semantic tokens.
- [THREAT_MODEL.md](THREAT_MODEL.md) - 14 threat vectors, attack surfaces, mitigations, and residual risks.
- [API.md](API.md) - FastAPI REST endpoint contracts, schemas, and error code specifications.
- [DEMO.md](DEMO.md) - 15-step demonstration walkthrough for SIH evaluators.
- [PERFORMANCE.md](PERFORMANCE.md) - Empirical benchmarks, microbenchmarks, and resource profiles.
- [FINAL_AUDIT.md](FINAL_AUDIT.md) - Reality audit, code verification matrix, and official SIH scorecard.
- [evaluation/README.md](evaluation/README.md) - Reproducible SIH evaluation benchmark suite and ground-truth dataset.
- [PRE_IMPLEMENTATION_AUDIT.md](PRE_IMPLEMENTATION_AUDIT.md) - *Historical* pre-implementation audit document.