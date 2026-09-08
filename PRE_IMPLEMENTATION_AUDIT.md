> [!IMPORTANT]
> **HISTORICAL DOCUMENT:**  
> This document describes the pre-implementation architecture and should not be used as the current project status.

# HISTORICAL: PRE-IMPLEMENTATION AUDIT & ARCHITECTURAL VERIFICATION
## Privacy-Preserving Browser Vision Agent (SIH Upgrade)

**Audit Date**: September 2026  
**Auditor**: Lead Architect & Browser Extension Security Engineer  
**Codebase**: Privacy Firewall Chrome Extension (Manifest V3)  
**Status**: Pre-Implementation Assessment & Architectural Plan Validation  

---

## 1. Executive Summary

This audit evaluates the existing **Privacy Firewall** Chrome Extension codebase against the proposed architecture in `implementation_plan.md` and the strict requirements of the SIH Master Prompt:
- **Core Principle**: The browser locally understands, sanitizes, and pixel-redacts sensitive data before any transmission. The AI server receives strictly sanitized structural metadata and returns structured, validated browser actions.
- **Fail-Closed Privacy**: If redaction or payload safety cannot be proven, the network upload is strictly blocked (`POLICY_VIOLATION`).
- **Zero Rewrite**: The existing working firewall (DOM scanner, Regex with Luhn check, ONNX NER, MediaPipe/face-api, Network Guard, Overlay System, Risk Scoring, and Automated Tests) is fully preserved and extended.

All 3 existing test suites (28 tests) currently pass, and both extension packaging (`npm run build:ext`) and React UI compilation (`npm run build`) succeed without errors.

---

## 2. Existing Repository Architecture & Inventory

### 2.1 File & Module Inventory

| File / Directory | Lines / Size | Current Responsibilities | Quality & Reusability |
|---|---|---|---|
| `public/manifest.json` | 47 lines | Chrome MV3 configuration. Permissions: `activeTab`, `scripting`, `storage`, `tabs`, `webRequest`, `declarativeNetRequest`. Background service worker: `background.js`. Content script: `content.js`. Action popup: `index.html`. | **High**. Needs additive permission (`offscreen` or tab capture if required) and updated description. |
| `webpack.config.js` | 50 lines | Compiles `src/content/content.ts` and `src/background/background.ts` via `ts-loader` into `public/`. | **High**. Reusable. Must ensure new folders are included in compilation. |
| `tsconfig.webpack.json` | 12 lines | Scopes TypeScript files for webpack bundling. Currently includes: `src/content`, `src/background`, `src/core`, `src/detectors`, `src/sanitization`, `src/network`, `src/chrome-types.d.ts`. | **Critical Configuration Note**: Must be extended to include new modules (`src/capture`, `src/vision`, `src/ocr`, `src/privacy`, `src/actions`, `src/overlays`, `src/workers`). |
| `package.json` | 57 lines | React 19, TypeScript 4.9.5, Tailwind CSS 3.4.19, `@xenova/transformers` 2.17.2, Webpack 5.110.3, React Scripts 5.0.1. | **High**. Healthy dependencies. |
| `src/core/types.ts` | 340 lines | Core type definitions: `DetectionType`, `DetectedItem`, `ScanResult`, `ExtensionState`, `ExtensionSettings`, `ScanMetrics`, `OVERLAY_COLORS`, `PLACEHOLDER_MAP`. | **High**. Reusable baseline. Needs additive agent action, a11y, vision, and payload types. |
| `src/core/utils.ts` | 340 lines | Helpers: `generateId`, `computeRiskScore`, `buildScanReport`, DOM selectors, Luhn validation helper. | **High**. Reusable baseline. |
| `src/detectors/domScanner.ts` | 390 lines | DOM tree traversal, input field inspection, password heuristics, CSS path / XPath calculation, visible bounding box computation. | **High**. Completely reusable. |
| `src/detectors/regexDetector.ts` | 224 lines | Regex patterns for Email, Phone, Credit Cards (with Luhn check), Gov ID, API keys, OpenAI, Anthropic, GitHub, Google, JWTs, DB URLs, Cloud keys (AWS, Azure, Supabase, Firebase, Stripe, Razorpay). Shannon entropy. | **High**. Reusable. Needs enhancement for Indian PII (Aadhaar 12-digit, PAN 10-char, Indian phone). |
| `src/detectors/allowlist.ts` | 98 lines | Zero false-positive allowlist for common framework identifiers, Google Sign-in chips, and developer UI labels. | **High**. Reusable. |
| `src/detectors/nerDetector.ts` | 148 lines | Local Named Entity Recognition using `@xenova/transformers` (`Xenova/bert-base-NER`) + regex address fallback. | **High**. Reusable. Can be offloaded to worker. |
| `src/detectors/faceDetector.ts` | 93 lines | Face detection on `<img>` tags using `face-api.js` (tinyFaceDetector). | **High**. Reusable. |
| `src/detectors/ocrDetector.ts` | 141 lines | Identifies DOM-uncovered crops (`canvas`, `img`, `svg`), dynamic import of `tesseract.js`, word & line bounding box reconstruction. | **High**. Reusable. Can be extended for full screenshot OCR. |
| `src/detectors/detectionEngine.ts` | 307 lines | Orchestrator running DOM scan, regex scan, NER scan, and face detection. Deduplicates overlapping detections, validates against allowlist, calculates risk scores. | **High**. Core detection orchestrator to be integrated into hybrid fusion. |
| `src/sanitization/sanitizer.ts` | 157 lines | `buildSanitizedPayload`, `sanitizeText`, `sanitizeObject`, and `validatePayloadIsSafe`. | **High**. Core sanitization logic already exists and directly satisfies Section 11 of the prompt! |
| `src/network/networkGuard.ts` | 95 lines | Injected network interceptor patching `window.fetch` and `XMLHttpRequest` to block outgoing PII leaks. | **High**. Must be preserved to ensure agent server requests do not bypass privacy checks. |
| `src/content/content.ts` | 293 lines | Injected content script. Auto-scan, MutationObserver throttled re-scan, overlay toggles, click-to-redact. | **High**. Reusable. Needs agent pipeline dispatch hook. |
| `src/content/overlay.ts` | 243 lines | DOM visual overlay badges with risk color-coding, hover cards, click-to-redact handling. | **High**. Fully functional and preserved. |
| `src/background/background.ts` | 527 lines | Service worker. Tab lifecycle tracking, storage management (`chrome.storage.session` for active scans, `chrome.storage.local` for settings), message router, injection fallbacks. | **High**. Reusable. Needs screenshot capture handler and server proxy routing. |
| `src/ui/popup/App.tsx` | 394 lines | Primary popup component (7 tabs: Overview, Items, Analytics, Diagnostics, Threats, Settings, Dev). | **High**. Preserved. Will be extended with an "Agent Mode" tab and control panel. |
| `src/ui/components/*` | 13 files | Header, RiskScore, ItemsTable, ActivityTimeline, DetailsModal, SanitizedPayloadView, OverlayToggle, ScanReportExport, AnalyticsChart, DiagnosticsPanel, SettingsPanel, DeveloperPanel, ThreatExplanationCard. | **High**. All functional and preserved. |
| `src/ui/hooks/useExtensionState.ts`| 194 lines | React state hook connecting popup UI to background service worker. | **High**. Reusable. |
| `src/__tests__/*` | 3 files | `detection.test.ts`, `productionAudit.test.ts`, `stateAndMessaging.test.ts`. 28 tests total. | **All Passing**. Must remain passing. |

---

## 3. Plan Validation & Technical Reality Check

Before executing the implementation, we have critically evaluated all assumptions in `implementation_plan.md`:

### 3.1 Vision Model Validation (MobileViT vs Reality)
- **Plan Proposal**: Use MobileViT-XXS ONNX model to classify visual elements (form, button, table, dialog, menu, image, chart, code) with bounding boxes.
- **Technical Reality**: MobileViT is an *image classification* model trained on ImageNet (classifying a full image into 1 of 1000 categories like "sports car", "espresso"), **not** a bounding box object detector! It cannot output bounding boxes `[x, y, w, h]` for UI elements out-of-the-box without custom object detection heads (like SSDLite/YOLO) trained on UI datasets.
- **Architectural Decision**: 
  1. For bounding-box UI element detection, use a lightweight, dedicated UI structure detector with fallback to geometric DOM-to-visual projection and canvas edge/region analysis.
  2. The primary privacy requirement is that the **vision model understands visual structure, while PII detection is handled by the multi-modal hybrid pipeline (DOM + Regex + NER + OCR + Face)**. The prompt specifically warns:
     > *"The vision model is responsible for understanding the visual structure of the page. It should NOT be assumed to detect PII by itself unless the selected model is actually trained for that purpose."*
  3. We will implement `src/vision/visionModel.ts` and `src/vision/elementClassifier.ts` with WebGPU -> WASM -> CPU fallback, supporting visual region classification (forms, tables, buttons, cards, charts) without falsely claiming MobileViT natively performs multi-class UI bounding box localization.

### 3.2 Screenshot Capture API in Chrome MV3
- **Plan Proposal**: Use `chrome.tabs.captureVisibleTab()`.
- **Technical Reality**: `chrome.tabs.captureVisibleTab()` requires either `<all_urls>` host permission or `activeTab`. The existing manifest already contains `<all_urls>` and `activeTab`.
- **Architectural Decision**: Capture visible tab in `background.ts` via `chrome.tabs.captureVisibleTab(null, { format: 'png' })`. For full-page capture, coordinate via `src/capture/fullPageStitcher.ts` scrolling increments, capturing visible viewports and stitching into a composite canvas.

### 3.3 Offscreen API vs In-Content / Service Worker Canvas
- **Plan Proposal**: Use Chrome Offscreen API for canvas processing.
- **Technical Reality**: In MV3 service workers, DOM `document` and standard `HTMLCanvasElement` are not available, although `OffscreenCanvas` is available in standard service workers in modern Chrome. However, pixel manipulation for redaction can run directly inside the content script or an offscreen document.
- **Architectural Decision**: Implement canvas-based redaction in `src/privacy/screenshotRedactor.ts` with universal compatibility (both `OffscreenCanvas` and standard `HTMLCanvasElement` fallback). This ensures flawless execution in both content script context and headless test environments without brittle offscreen document lifecycle issues.

### 3.4 OCR (Tesseract.js) Integration
- **Plan Proposal**: Run Tesseract.js inside a dedicated Web Worker.
- **Technical Reality**: Chrome MV3 has strict CSP (`script-src 'self'`) forbidding remote code execution or CDN-based `importScripts`. Tesseract.js v5 supports local worker loading. Moreover, the existing `src/detectors/ocrDetector.ts` already has a clean dynamic import and word/line bounding-box extractor.
- **Architectural Decision**: Build `src/ocr/ocrEngine.ts` and `src/workers/ocr.worker.ts` wrapping Tesseract with local fallbacks, crop-based selective OCR (only OCR regions not already represented in the DOM), and Hindi + English language support.

### 3.5 Face Detection Compatibility
- **Plan Proposal**: MediaPipe / face-api.js.
- **Existing Implementation**: `src/detectors/faceDetector.ts` already implements `face-api.js` (tinyFaceDetector) on `img` elements.
- **Architectural Decision**: Reuse and extend `faceDetector.ts` to also support scanning cropped regions from the tab screenshot so faces rendered inside canvas, WebGL, or CSS backgrounds are also detected and redacted.

### 3.6 WebGPU Fallback
- **Requirement**: WebGPU -> WASM -> CPU fallback.
- **Architectural Decision**: Detect `navigator.gpu`. If unavailable or model session creation fails, fallback to WASM (`ort.env.wasm`), and if WASM is constrained, fallback to CPU execution providers. Report the active backend in the UI diagnostics (`Vision Backend: WebGPU / WASM / CPU`).

### 3.7 Indian Identity Patterns (Aadhaar & PAN)
- **Prompt Requirement**: Aadhaar, PAN, passport, bank information.
- **Current Limitation**: `regexDetector.ts` currently only matches US SSN (`[0-9]{3}-[0-9]{2}-[0-9]{4}`) and passports.
- **Architectural Decision**: Add dedicated patterns and Luhn/Verhoeff validation for:
  - **Aadhaar**: `\b\d{4}\s\d{4}\s\d{4}\b` and `\b\d{12}\b` (with Verhoeff algorithm check where appropriate)
  - **PAN Card**: `\b[A-Z]{5}[0-9]{4}[A-Z]\b`
  - **Indian Phone**: `\b(?:\+91|0)?[6-9]\d{9}\b`
  - **Bank Account / IFSC**: `\b[A-Z]{4}0[A-Z0-9]{6}\b`

### 3.8 Server VLM Selection & Type Action Privacy
- **Plan Proposal**: Qwen2.5-VL-7B / InternVL2.
- **Prompt Strict Requirement**: 
  1. The server must **never** receive raw secrets.
  2. The server must **never** return raw sensitive strings to type. It must use local references (`valueRef: "LOCAL_EMAIL"`).
  3. Action planner must strictly validate against actions schema (`click`, `type`, `scroll`, `select`, `hover`, `focus`, `submit`, `wait`).
  4. Prompt injection defense: Untrusted webpage text must be strictly quarantined as DATA, never system instructions.
- **Architectural Decision**: Build FastAPI backend in `server/` with:
  - Strict Pydantic schemas rejecting any raw PII in request or response.
  - VLM inference engine supporting local open-source VLM (Qwen2.5-VL-3B / MiniCPM-V-2.6) with structured JSON generation and deterministic rule-based planning fallback for lightweight SIH demo environments.
  - Client-side `ActionExecutor` resolving `LOCAL_*` tokens locally from extension state, verifying element visibility, bounding boxes, and requiring explicit user confirmation before touching sensitive or submission targets.

---

## 4. Architectural Comparison: Existing vs Required

| Module | Existing Status | Required Enhancement | Status |
|---|---|---|---|
| **DOM Scanner** | Full DOM traversal, input inspection, bounding boxes, CSS selectors. | Extract clean sanitized DOM skeleton and accessibility tree. | Reuse + Add A11y tree builder |
| **Regex Detector** | 22 credential & PII types, Luhn check, Shannon entropy. | Add Indian PII (Aadhaar, PAN, IFSC). | Enhance existing module |
| **NER Detector** | ONNX BERT NER via `@xenova/transformers`. | Offload to worker or async queue. | Reuse existing module |
| **Face Detector** | `face-api.js` on `<img>` tags. | Extend to detect faces in screenshot crops. | Reuse & extend |
| **OCR Detector** | Selective DOM-crop OCR with Tesseract dynamic import. | Support full screenshot OCR + region OCR. | Reuse & extend |
| **Hybrid Fusion** | Basic deduplication in `detectionEngine.ts`. | True multi-modal IoU bounding-box fusion into `SensitiveRegion[]`. | **NEW** (`src/privacy/hybridFusion.ts`) |
| **Screenshot Capture** | Not implemented. | `captureVisibleTab` + `fullPageStitcher`. | **NEW** (`src/capture/`) |
| **Screenshot Redactor** | DOM overlay badges and text replacement only; no pixel redaction. | Canvas pixel-level blackout & blur with post-redaction pixel verification. | **NEW** (`src/privacy/screenshotRedactor.ts`) |
| **Fail-Closed Policy** | Basic `validatePayloadIsSafe` for JSON payloads. | Fail-closed policy engine: verifies payload + screenshot pixels; blocks network on violation. | **NEW / EXTEND** (`src/privacy/policyEngine.ts`) |
| **A11y Tree Builder** | Not implemented. | Sanitized accessibility hierarchy (role, label, selector, bbox). | **NEW** (`src/overlays/accessibilityTree.ts`) |
| **Action Executor** | Not implemented. | Safe action runner (`click`, `type`, `scroll`, `submit`, etc.) with local token resolution & validation. | **NEW** (`src/actions/actionExecutor.ts`) |
| **Action Confirmation** | Not implemented. | User confirmation toast/modal for submit, auth, or sensitive actions. | **NEW** (`src/actions/confirmationHook.ts`) |
| **Agent UI** | 7 tabs in Popup (Overview, Items, Analytics, etc.). | Add "Agent Mode" toggle, Live Action Log, Sanitized Preview, and Privacy Audit display. | **EXTEND** `src/ui/popup/App.tsx` + `AgentPanel.tsx` |
| **FastAPI Server** | Not implemented. | Complete Python FastAPI backend (`/analyze`, VLM inference, action planner, prompt injection guard). | **NEW** (`server/`) |
| **Security & Auditing** | JSON export of scan reports. | Local immutable privacy audit log (`PrivacyAuditLog`), CSRF/XSS sanitization, prompt injection defense. | **NEW** |

---

## 5. Conflicting Components & Resolution

1. **Popup File Name Conflict**:
   - *Conflict*: Plan specifies `src/ui/popup/Popup.tsx`, but actual file is `src/ui/popup/App.tsx`.
   - *Resolution*: Extend `src/ui/popup/App.tsx` directly. Create `src/ui/components/AgentPanel.tsx` and integrate it as a first-class tab in `App.tsx`.
2. **TypeScript Webpack Configuration Scope**:
   - *Conflict*: `tsconfig.webpack.json` will ignore new source folders.
   - *Resolution*: Update `tsconfig.webpack.json` `"include"` array to include all new source subdirectories.
3. **Action Typing with Raw PII**:
   - *Conflict*: Plan example showed `{ action: "type", text: "example@gmail.com" }`.
   - *Resolution*: Strictly prohibit raw strings for sensitive fields. Implement token references (`valueRef: "LOCAL_EMAIL"`) resolved client-side from the browser's local memory.
4. **Offscreen API Overhead**:
   - *Conflict*: Plan required Offscreen API for simple canvas operations.
   - *Resolution*: Canvas redaction can be executed in content script or via standard Canvas / OffscreenCanvas. Provide modular architecture with zero unnecessary complexity.

---

## 6. Comprehensive Risk Analysis

| Risk | Impact | Probability | Mitigation Strategy |
|---|---|---|---|
| **Raw PII Leaks to AI Server** | High (Critical Breach) | Low | Multi-stage fail-closed validation: `validatePayloadIsSafe()` inspects screenshot pixels, sanitized DOM, OCR text, and a11y tree. If any violation exists, immediately throw `POLICY_VIOLATION` and abort transmission. |
| **WebGPU Not Supported on Client** | Medium | High | Implement automatic fallback chain: WebGPU -> WASM -> CPU. Display current backend in UI diagnostics. |
| **VLM Prompt Injection** | High | Medium | Strict separation between System Instructions and Untrusted Page Data. Webpage content formatted as escaped data payloads. |
| **Arbitrary Code Execution via Actions** | High | Low | Server returns ONLY structured action schemas (`action`, `selector`, `valueRef`). Never execute `eval()`, inline scripts, or `javascript:` URIs. Target elements are verified before any click/type event. |
| **Content Script Main-Thread Freezing** | Medium | Medium | Heavy tasks (OCR, ONNX inference, full-page stitching) run asynchronously or inside dedicated Web Workers. |
| **Existing Tests Regressing** | High | Low | Run full test suite (`npm test`) after every phase. Ensure existing 28 tests always pass. |

---

## 7. Recommended Implementation Order (Phased Roadmap)

We strictly follow the sequential, verified engineering workflow specified by the user:

- **Phase 0: Repository Audit & Planning Verification** *(Completed by this document)*
- **Phase 1: Shared Types & Schemas**
  - Add `AgentAction`, `A11yNode`, `VisualElement`, `OcrResult`, `SensitiveRegion`, `AnalyzeRequest`, `AnalyzeResponse`, `AuditRecord`.
  - Add Indian PII types (`AADHAAR`, `PAN`) to `types.ts` and `regexDetector.ts`.
- **Phase 2: Screenshot Capture Engine**
  - `src/capture/screenshotCapture.ts` (visible tab capture via background).
  - `src/capture/fullPageStitcher.ts` (viewport scrolling and stitching).
- **Phase 3: Worker Infrastructure**
  - `src/workers/ocr.worker.ts` & `src/workers/vision.worker.ts` scaffolds for non-blocking execution.
- **Phase 4: Vision & OCR Engine**
  - `src/ocr/ocrEngine.ts` (crop and full-screenshot OCR with bounding boxes).
  - `src/vision/visionModel.ts` & `src/vision/elementClassifier.ts` (UI structure classifier with WebGPU -> WASM -> CPU fallback).
- **Phase 5: Hybrid Privacy Fusion**
  - `src/privacy/hybridFusion.ts` (IoU bounding-box fusion merging DOM, Regex, NER, OCR, Face, and Vision detections into unified `SensitiveRegion[]`).
- **Phase 6: Screenshot Redaction Engine**
  - `src/privacy/screenshotRedactor.ts` (blackout and blur pixel redaction on canvas + pixel verification).
- **Phase 7: Sanitized Accessibility Tree & DOM Skeleton**
  - `src/overlays/accessibilityTree.ts` (sanitized hierarchy, role, aria-label, selector, bounding boxes).
- **Phase 8: Fail-Closed Privacy Policy Engine & Final Validation**
  - `src/privacy/policyEngine.ts` (verifies safe screenshot + safe metadata; fail-closed upload blocker).
- **Phase 9: FastAPI Server**
  - `server/main.py`, `server/api/analyze.py`, `server/actions/action_schema.py`.
- **Phase 10: Server VLM Integration & Prompt Injection Defense**
  - `server/vlm/model.py`, `server/prompts/system_prompt.py` (strict separation of system prompt from untrusted webpage text).
- **Phase 11: Action Planner (Server-side)**
  - `server/planner/action_planner.py` (structured action generation with `LOCAL_*` value references).
- **Phase 12: Action Executor (Client-side)**
  - `src/actions/actionExecutor.ts` (validates selectors, verifies element visibility, resolves local tokens, executes safe actions).
- **Phase 13: Action Confirmation Hook**
  - `src/actions/confirmationHook.ts` (interactive user confirmation toast for sensitive/submit actions).
- **Phase 14: Agent UI Extensions**
  - `src/ui/components/AgentPanel.tsx` (Agent mode toggle, live action history, sanitized screenshot thumbnail, privacy stats).
  - Integrate into `src/ui/popup/App.tsx`.
- **Phase 15: Security Testing & Comprehensive Unit Tests**
  - Add tests for capture, OCR, redaction, action execution, prompt injection defense, and fail-closed privacy.
- **Phase 16: Performance Benchmarking**
  - Benchmark pipeline timings (capture, OCR, fusion, redaction, validation).
- **Phase 17: SIH Demo Hardening & Documentation**
  - Update `README.md`, `ARCHITECTURE.md`, `PRIVACY_MODEL.md`, `THREAT_MODEL.md`, `API.md`, `DEMO.md`, `PERFORMANCE.md`.

---

**Audit Sign-off**: Proceeding to Phase 1 upon confirmation. Existing codebase integrity confirmed 100% operational.
