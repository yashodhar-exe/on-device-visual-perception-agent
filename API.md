# REST API Specification: Privacy-Preserving Vision Server

The FastAPI backend serves as the planning engine for the Privacy-Preserving Browser Vision Agent. It processes **strictly sanitized, privacy-verified payloads** and returns structured, actionable browser plans.

- **Base URL**: `http://127.0.0.1:8000`
- **Authentication**: Optional Bearer token (`Authorization: Bearer <TOKEN>`) via `PF_SERVER_SECRET`.

---

## 1. Endpoints

### 1.1 Health & Engine Status

Check backend readiness and active agent engine mode.

```http
GET /health
```

#### Response (`200 OK`)

```json
{
  "status": "healthy",
  "service": "Privacy-Preserving Browser Vision Agent Server",
  "version": "1.0.0",
  "auth_enabled": false,
  "vlm_ready": true
}
```

- **Current verified agent engine:** Deterministic structured action planner.
- **Optional neural VLM:** The architecture supports integration of local open-source vision-language models such as Qwen2.5-VL-class models when compatible model weights and hardware are available.

---

### 1.2 Analyze Page & Synthesize Actions

Synthesize safe browser actions from sanitized visual and structural representations.

```http
POST /api/analyze
Content-Type: application/json
```
*(Also registered at `POST /analyze`)*

#### Request Schema (`AnalyzeRequest`)

```json
{
  "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "accessibilityTree": [
    {
      "role": "textbox",
      "label": "EMAIL=YOUR_EMAIL",
      "selector": "#email-input",
      "ariaLabel": "Email Address",
      "tagName": "INPUT",
      "boundingBox": { "x": 100, "y": 120, "width": 260, "height": 38 }
    },
    {
      "role": "textbox",
      "label": "PASSWORD=YOUR_PASSWORD",
      "selector": "#password-input",
      "ariaLabel": "Password",
      "tagName": "INPUT",
      "boundingBox": { "x": 100, "y": 180, "width": 260, "height": 38 }
    },
    {
      "role": "button",
      "label": "Sign In",
      "selector": "#submit-btn",
      "tagName": "BUTTON",
      "boundingBox": { "x": 100, "y": 240, "width": 140, "height": 42 }
    }
  ],
  "domStructure": "<form id=\"login-form\"><input id=\"email-input\" placeholder=\"EMAIL=YOUR_EMAIL\" /><input id=\"password-input\" type=\"password\" placeholder=\"PASSWORD=YOUR_PASSWORD\" /><button id=\"submit-btn\">Sign In</button></form>",
  "ocrText": "Sign in to portal EMAIL=YOUR_EMAIL PASSWORD=YOUR_PASSWORD",
  "url": "http://localhost:3000/login",
  "taskDescription": "Sign in to portal with user credentials and submit",
  "timestamp": 1773057600.0,
  "context": "NORMAL"
}
```

> **Note on Context Enforcement:** If the `context` field is `"AUTHENTICATION"`, `"MESSAGING"`, or `"SOCIAL_MEDIA"`, or if page analysis detects an excluded context, the backend automatically rejects the request with HTTP 422 `POLICY_VIOLATION`. The server refuses to process or plan actions on authentication pages, messaging interfaces, or social media platforms. On `"AI_ASSISTANT"` websites, the client-side Send-Button Privacy Gate enforces local redaction before any submission.

#### Response Schema (`AnalyzeResponse` - `200 OK`)

```json
{
  "actions": [
    {
      "action": "type",
      "selector": "#email-input",
      "valueRef": "LOCAL_EMAIL",
      "reason": "Enter user email reference into login field",
      "requiresConfirmation": false,
      "confidence": 0.95
    },
    {
      "action": "type",
      "selector": "#password-input",
      "valueRef": "LOCAL_PASSWORD",
      "reason": "Enter password reference into secure input field",
      "requiresConfirmation": true,
      "confidence": 0.95
    },
    {
      "action": "click",
      "selector": "#submit-btn",
      "reason": "Click submit button to submit login form",
      "requiresConfirmation": true,
      "confidence": 0.92
    }
  ],
  "reasoning": "Analyzed 3 accessibility nodes and sanitized layout. Synthesized 3 safe actions with local token references. Prompt injection defense verified: untrusted page content quarantined.",
  "confidence": 0.92,
  "policySafe": true,
  "engineMode": "deterministic_fallback",
  "modelName": "Qwen/Qwen2.5-VL-3B-Instruct",
  "device": "cpu",
  "statusMessage": null
}
```

---

## 2. Action Schema Specification

The backend emits actions strictly conforming to `AgentAction`:

| Field | Type | Description |
|---|---|---|
| `action` | `string` | Permitted primitive: `click`, `type`, `scroll`, `select`, `hover`, `focus`, `submit`, `wait`. |
| `selector` | `string` (optional) | Target CSS selector. Prohibits `javascript:`, `eval(`, `<script`, and event handlers. |
| `valueRef` | `string` (optional) | Symbolic credential reference: `LOCAL_EMAIL`, `LOCAL_PASSWORD`, `LOCAL_AADHAAR`, `LOCAL_PAN`. |
| `text` | `string` (optional) | Literal text for non-sensitive input. Pydantic validator rejects any detected raw PII. |
| `direction` | `string` (optional) | For scroll actions: `up`, `down`, `left`, `right`. |
| `requiresConfirmation` | `boolean` | Flags high-risk actions (passwords, submit buttons, payment actions). |
| `confidence` | `float` | Planning confidence score between 0.0 and 1.0. |
| `reason` | `string` (optional) | Explanation of the intended browser action. |

---

## 3. Canonical Error Table

| HTTP Status | Error Identifier | Condition & Trigger |
| :--- | :--- | :--- |
| **`422 Unprocessable Entity`** | `POLICY_VIOLATION` | Raw sensitive PII/credential detected in incoming `domStructure`, `ocrText`, or action `text` fields, or request context is blocked (`AUTHENTICATION` / `MESSAGING` / `SOCIAL_MEDIA`). Transmission rejected fail-closed. |
| **`422 Unprocessable Entity`** | `SCHEMA_ERROR` | Request or action failed Pydantic validation (e.g., malformed base64 image, disallowed action type, malicious selector). |
| **`401 Unauthorized`** | `UNAUTHORIZED` | Missing or invalid Bearer token when server authentication (`PF_SERVER_SECRET`) is enabled. |
| **`500 Internal Server Error`** | `VLM_INFERENCE_ERROR` | Unhandled backend planning failure or model execution exception. |
