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
USER
 │
 ▼
CHROME TAB
 │
 ▼
DOM + SCREENSHOT
 │
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
SCREENSHOT PIXEL REDACTION (Canvas Blackout + Luminance Check)
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
AGENT ENGINE
 ├── CURRENT: Deterministic Structured Planner
 └── OPTIONAL: Local Neural VLM
 │
 ▼
ACTION VALIDATOR (Disallows malicious selectors / code injection)
 │
 ▼
LOCAL SYMBOLIC TOKEN RESOLUTION (LOCAL_EMAIL, LOCAL_PASSWORD)
 │
 ▼
USER CONFIRMATION FOR HIGH-RISK ACTIONS (In-DOM Dialog)
 │
 ▼
ACTION EXECUTOR (Native DOM Event Dispatch)
 │
 ▼
LOCAL AUDIT LOG (Immutable Record in chrome.storage.local)
```

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
