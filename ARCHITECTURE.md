# System Architecture: Privacy-Preserving Browser Vision Agent

Privacy-Preserving Browser Vision Agent is a Chrome Manifest V3 extension that detects and sanitizes sensitive information locally before page information is transmitted to an agent backend.

The browser combines DOM analysis, pattern-based PII and secret detection, local OCR, visual-region processing, semantic redaction, and fail-closed policy validation.

Only sanitized screenshots and structural metadata are transmitted to the backend.

The backend returns strictly validated browser actions using symbolic references such as `LOCAL_EMAIL` and `LOCAL_PASSWORD`. These references are resolved exclusively inside the browser, so the backend never receives the underlying credentials.

---

## 1. High-Level Architecture Diagram

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
 ├── Regex
 ├── NER
 ├── OCR
 └── Face Detection
 │
 ▼
HYBRID FUSION
 │
 ▼
SEMANTIC REDACTION
 │
 ▼
SCREENSHOT PIXEL REDACTION
 │
 ▼
FAIL-CLOSED POLICY VALIDATION
 │
 ▼
SANITIZED PAYLOAD
 │
 ▼
FASTAPI
 │
 ▼
AGENT ENGINE
 ├── CURRENT: Deterministic Structured Planner
 └── OPTIONAL: Local Neural VLM
 │
 ▼
ACTION VALIDATOR
 │
 ▼
LOCAL SYMBOLIC TOKEN RESOLUTION
 │
 ▼
USER CONFIRMATION FOR HIGH-RISK ACTIONS
 │
 ▼
ACTION EXECUTOR
 │
 ▼
LOCAL AUDIT LOG
```

---

## 2. Agent Engine Specification

To ensure technical accuracy and avoid misrepresentation:

- **Current verified agent engine:**
  **Deterministic structured action planner.**
  The currently verified and active server engine parses sanitized structural accessibility nodes, forms, and task requirements to deterministically emit safe, structured browser actions with symbolic credential references.

- **Optional neural VLM:**
  **The architecture supports integration of local open-source vision-language models such as Qwen2.5-VL-class models when compatible model weights and hardware are available.**
  The FastAPI server includes model configuration and hardware probing modules (`server/vlm/loader.py`, `server/vlm/model.py`) that can dynamically attach a neural vision-language model without changing the client-side privacy firewall or action schemas.

*(Note: The deterministic structured planner is an algorithmic rule-based synthesizer and is not a neural VLM.)*

---

## 3. Subsystem Breakdown

### 3.1 Client Extension Subsystems (Browser)

The extension operates under Google Chrome Manifest V3, divided into content scripts, service workers, and dedicated worker threads:

1. **DOM Scanner (`src/detectors/domScanner.ts`)**
   - Traverses live DOM hierarchies to inspect form inputs, ARIA roles, text containers, and computes client bounding boxes.
   - Evaluates input field semantics, identifying passwords, PINs, and secure credentials.

2. **Pattern-Based Detection & Verification (`src/detectors/regexDetector.ts`)**
   - Validates Indian National IDs: Verhoeff-checksum-verified Aadhaar numbers, 10-character PAN identifiers, and RBI IFSC codes.
   - Detects financial credentials: Luhn-checksum-verified Credit Cards across Visa, Mastercard, Amex, and Discover.
   - Identifies enterprise secrets: Google API keys, Stripe secret keys, Supabase anon and service role keys, Database connection URLs (Postgres, Mongo, Redis), and JWT tokens.

3. **Local Machine Learning & Vision Detectors**
   - **Local ONNX NER (`src/detectors/nerDetector.ts`)**: Named Entity Recognition using quantized transformer pipelines (`@xenova/transformers`) running in-browser with graceful CPU fallback.
   - **Tesseract OCR (`src/ocr/ocrEngine.ts`, `src/workers/ocr.worker.ts`)**: Worker-isolated text extraction on image and canvas elements.
   - **Vision Element Classifier (`src/vision/elementClassifier.ts`, `src/workers/vision.worker.ts`)**: Regional visual layout analysis.
   - **Face Detection (`src/detectors/faceDetector.ts`)**: Client-side bounding box identification for human faces.

4. **Hybrid Fusion Engine (`src/privacy/hybridFusion.ts`)**
   - Merges bounding boxes across DOM nodes, OCR tokens, regex spans, and visual detections using Intersection over Union (IoU > 0.4) spatial clustering.
   - Unifies overlapping detections into cohesive redaction regions, eliminating redundant processing.

5. **Semantic Redaction & Pixel Redactor (`src/sanitization/semanticPlaceholder.ts`, `src/privacy/screenshotRedactor.ts`)**
   - Applies context-preserving semantic placeholders across DOM structures, accessibility trees, and OCR text.
   - Performs canvas pixel blackout with safety margins (`#050505` fill with `#1F2937` borders) on screenshot canvases.
   - Automates post-redaction luminance scanning to verify that no high-luminance visual text escapes into the image buffer.

6. **Fail-Closed Policy Engine (`src/privacy/policyEngine.ts`)**
   - Inspects all outgoing payload structures (`validatePayloadBeforeTransmission`).
   - If any unredacted region, raw secret pattern, or unverified bounding box is detected, transmission is immediately aborted with `POLICY_VIOLATION`.

7. **Action Validator & Confirmation Hook (`src/actions/actionExecutor.ts`, `src/actions/confirmationHook.ts`)**
   - Inspects all server-returned action schemas against an allowlist (`click`, `type`, `scroll`, `select`, `hover`, `focus`, `submit`, `wait`).
   - Filters selectors to reject `javascript:`, `eval(`, `<script`, and event handler injections.
   - Renders an accessible in-DOM confirmation dialog for high-risk actions (password typing, form submission, payment buttons).

8. **Action Executor & Symbolic Credential Resolver (`src/actions/actionExecutor.ts`)**
   - Resolves symbolic references (`LOCAL_EMAIL`, `LOCAL_PASSWORD`, `LOCAL_AADHAAR`, `LOCAL_PAN`) from local browser storage directly within the tab execution context.
   - Dispatches native trusted DOM events (`focus`, `input`, `change`, `click`).

9. **Local Audit Logger (`src/core/utils.ts`)**
   - Records immutable per-action audit entries into local extension storage documenting timestamp, detection count, redaction count, server response status, and verifying zero raw PII transmission.

---

### 3.2 Server Subsystems (FastAPI Backend)

The Python FastAPI backend operates on `http://127.0.0.1:8000`:

1. **API Router (`server/api/analyze.py`)**
   - `GET /health`: Health, readiness, and active engine reporting.
   - `POST /api/analyze` (and `POST /analyze`): Receives sanitized structural metadata and screenshots; outputs validated browser actions.
   - Optional Bearer token authorization (`EXPECTED_TOKEN`).

2. **Pydantic Validation & Security Invariant (`server/actions/action_schema.py`)**
   - Validates `AnalyzeRequest` and `AnalyzeResponse` data schemas.
   - Rejects raw sensitive strings in incoming metadata with HTTP `422 POLICY_VIOLATION`.
   - Prohibits arbitrary executable scripts or malicious patterns in CSS selectors.

3. **Anti-Injection System Prompt (`server/prompts/system_prompt.py`)**
   - Treats DOM skeletons and OCR text strictly as untrusted data (`<UNTRUSTED_DOM_DATA>`, `<UNTRUSTED_OCR_DATA>`).
   - Instructs the engine that user goals originate solely from `taskDescription`, neutralizing indirect prompt injections.

4. **Structured Action Planner (`server/planner/action_planner.py`)**
   - Deterministic rule-based planner that constructs safe action sequences mapped to accessibility selectors and attaches `requiresConfirmation: true` to sensitive elements.

5. **VLM Integration Layer (`server/vlm/loader.py`, `server/vlm/model.py`)**
   - Hardware detection for CUDA, Apple Silicon MPS, or CPU execution.
   - Adapter interface for optional neural VLM inference (e.g. Qwen2.5-VL-3B-Instruct) with transparent fallback to deterministic action planning.

---

## 4. Semantic Placeholder Architecture

To prevent breaking layout comprehension or schema understanding for vision and language processing, raw sensitive values are replaced with context-aware semantic placeholders:

```
Raw Page Data
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA...
    NEXT_PUBLIC_SUPABASE_URL=https://proj.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
    DATABASE_URL=postgresql://user:pass@host/db
    user@example.com / SecretPassword123
              │
              ▼
   Local Regex / DOM Detection
              │
              ▼
   Context Extraction (Variable names, labels, attributes)
              │
              ▼
   Semantic Placeholder Generation
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
    DATABASE_URL=YOUR_DATABASE_URL
    EMAIL=YOUR_EMAIL / PASSWORD=YOUR_PASSWORD
              │
              ▼
   Canvas Redaction + Metadata Serialization
              │
              ▼
   Fail-Closed Policy Validation
              │
              ▼
   Server Transmission (Safe Context Preserved, Zero Secret Leaked)
```

---

## 5. Security & Isolation Invariants

1. **Zero-Raw-PII Invariant**: Raw credentials, private keys, government IDs, and card numbers never exit the browser boundary.
2. **Symbolic Credential Invariant**: The server receives only sanitized references and returns symbolic tokens (`LOCAL_*`). The server runtime never possesses or stores user credentials.
3. **Fail-Closed Gate**: Any detected anomaly, unverified redaction boundary, or regex match in outgoing payloads terminates network dispatch with `POLICY_VIOLATION`.
4. **No Arbitrary Code Execution**: No `eval()`, no dynamic code construction, and no execution of untrusted script payloads returned from server or webpage environments.
