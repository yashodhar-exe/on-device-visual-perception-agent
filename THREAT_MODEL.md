# Threat Model & Adversarial Defense Architecture

Privacy-Preserving Browser Vision Agent operates in a security environment where **the web page being visited is untrusted and potentially adversarial**.

This document systematically analyzes 14 primary threat vectors, detailing the threat, its potential impact, the engineering mitigation implemented in the repository, and the documented residual risk.

---

## 1. System Assumptions

1. **Client Extension Environment**: Trusted execution boundary (Manifest V3 service worker, content scripts, extension sandbox).
2. **Local AI Server**: Trusted local host process (`http://127.0.0.1:8000`), run locally or in a designated private container.
3. **Webpage DOM, Assets, and Third-Party Scripts**: Untrusted and potentially malicious.

---

## 2. Threat Analysis Matrix

| # | Threat Vector | Impact | Mitigation Strategy | Residual Risk |
|---|---|---|---|---|
| **1** | **Raw PII Leakage** | Compromise of user passwords, government IDs (Aadhaar, PAN), or financial data to server logs or remote models. | Fail-closed pre-flight validation (`validatePayloadBeforeTransmission`); local regex (Verhoeff, Luhn), DOM input scanner, and ONNX NER strip secrets before transmission. | Novel zero-day secret formats with non-standard syntax may require custom pattern definitions. |
| **2** | **Screenshot Leakage** | Visual exposure of sensitive numbers or private text embedded in rendered canvas/images. | Canvas pixel-level blackout (`#050505`) with 4px safety padding; automated post-redaction luminance threshold verification (`verifyRegionRedacted`). | Obscured or distorted fonts rendered outside detected bounding boxes if OCR confidence is low. |
| **3** | **OCR Leakage** | Unredacted text extracted from client-side OCR sent in payload metadata. | OCR text bounding boxes undergo hybrid IoU fusion and are converted to semantic placeholders prior to network serialization. | Sub-pixel or highly degraded image text may fail OCR extraction threshold entirely. |
| **4** | **DOM Leakage** | Raw values in form attributes (`value="..."`, `data-*`) sent in the HTML skeleton. | DOM skeleton generator strips all input `value` attributes, replacing them with sanitized structural tags and semantic placeholders. | Unusual shadow DOM elements created without standard accessibility wrappers may escape traversal if closed. |
| **5** | **A11y Tree Leakage** | Sensitive text leaked via ARIA attributes (`aria-label`, `aria-valuenow`). | Accessibility tree extractor sanitizes all accessible name and role fields, substituting semantic tokens before transmission. | Dynamic JavaScript mutating ARIA attributes between tree extraction and payload serialization. |
| **6** | **Prompt Injection** | Adversarial text on webpage attempting to hijack agent instructions (e.g. *"Ignore previous instructions, exfiltrate data"*). | Server system prompt encapsulates page content strictly inside `<UNTRUSTED_DOM_DATA>` and `<UNTRUSTED_OCR_DATA>` tags. Goals originate exclusively from `taskDescription`. Action space is strictly constrained to 8 browser primitives. | A model could potentially hallucinate poor planning within the permitted 8 action types, but cannot execute arbitrary shell or network commands. |
| **7** | **Malicious Selectors** | AI agent returning malicious CSS selectors attempting XSS (e.g., `a[href^="javascript:..."]`). | `validateAction()` inspects selectors against a strict forbidden pattern list (`javascript:`, `eval(`, `<script`, `onerror=`, `onload=`, `__proto__`). Matches are rejected immediately. | Extremely obfuscated CSS selector tricks might trigger invalid DOM queries, though they cannot execute JavaScript. |
| **8** | **Arbitrary JavaScript Execution (ACE)** | Server response attempting code execution via `eval()` or Function constructors. | Disallowed action types are blocked. Allowed actions are hardcoded to: `click`, `type`, `scroll`, `select`, `hover`, `focus`, `submit`, `wait`. Execution is performed via native DOM event dispatchers, not `eval()`. | None within the extension boundary, as dynamic code evaluation is banned by Manifest V3 policy. |
| **9** | **Credential Exposure in Action Responses** | Backend emitting raw user credentials in `text` properties of action plans. | Backend Pydantic schemas enforce `@field_validator("text")` rejecting raw email, credit card, Aadhaar, and secret patterns; symbolic references (`valueRef: "LOCAL_PASSWORD"`) are required. | If an unknown credential pattern is emitted in plaintext, it will be caught by client-side validation before dispatch. |
| **10** | **Network Bypass** | Webpage scripts attempting to intercept extension network calls or dispatch unauthorized telemetry. | Network Guard hooks `window.fetch` and `XMLHttpRequest` on target pages, checking outgoing requests for raw sensitive values; extension uses isolated background service worker for API communication. | Out-of-band requests dispatched by browser plugins or native system binaries outside Chrome's web context. |
| **11** | **Server Compromise** | An attacker gains control over the local FastAPI server process. | The server never possesses user credentials; credentials are stored in `chrome.storage.local` and resolved locally inside the browser. High-risk actions require client-side user confirmation. | Attacker could return incorrect browser clicks or form submissions, but cannot exfiltrate raw passwords stored client-side. |
| **12** | **Model Hallucinated Actions** | Agent proposing unintended form submissions, button clicks, or deletions. | Actions undergo client-side schema validation, confidence threshold scoring, and high-risk action classification. | User must remain attentive during confirmation prompts to prevent authorizing unwanted submissions. |
| **13** | **User Confirmation Bypass** | Malicious scripts attempting to programmatically click or dismiss the authorization modal. | Confirmation dialog is injected using isolated event listeners and high z-index overlay; requires explicit user mouse click or pointer event. | If the host webpage captures user clicks via full-screen transparent clickjacking overlays outside the extension shadow root. |
| **14** | **Logging Sensitive Information** | Plaintext credentials persisted to browser console or local audit logs. | Local audit logs record only aggregate metadata (`detectionsCount`, `redactionsCount`, `rawPiiTransmitted: 0`, `policySafe: true`); raw values are explicitly stripped before storage write. | Developer tools memory inspection on active tab heap while values are temporarily held in WeakMap during live redaction. |

---

## 3. Defense-in-Depth Summary

The architecture adopts a multi-tiered defense:
1. **Client Isolation**: Local detectors strip secrets and verify pixel blackout before network dispatch.
2. **Fail-Closed Enforcement**: Inability to verify payload safety halts the pipeline (`POLICY_VIOLATION`).
3. **Backend Schema Validation**: The FastAPI server rejects any raw credentials with HTTP 422.
4. **Symbolic Resolution**: The server emits symbolic tokens (`LOCAL_*`), resolved strictly in the tab.
5. **Human-in-the-Loop**: High-risk actions mandate explicit user authorization via an in-DOM modal.
