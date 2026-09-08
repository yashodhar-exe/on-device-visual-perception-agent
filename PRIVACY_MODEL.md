# Privacy Model & Fail-Closed Invariants

Privacy-Preserving Browser Vision Agent is a Chrome Manifest V3 extension that detects and sanitizes sensitive information locally before page information is transmitted to an agent backend.

The browser combines DOM analysis, pattern-based PII and secret detection, local OCR, visual-region processing, semantic redaction, and fail-closed policy validation.

Only sanitized screenshots and structural metadata are transmitted to the backend.

The backend returns strictly validated browser actions using symbolic references such as `LOCAL_EMAIL` and `LOCAL_PASSWORD`. These references are resolved exclusively inside the browser, so the backend never receives the underlying credentials.

---

## 1. The Fail-Closed Privacy Principle

Traditional data-loss prevention utilities operate under a permissive default:
> *If sensitive data is recognized → Redact. If no pattern matches → Transmit.*

In autonomous vision-agent environments, permissive defaults create high vulnerability to unknown layouts, atypical fonts, or partial detections.

The **Privacy-Preserving Browser Vision Agent** enforces a **fail-closed zero-raw-PII transmission invariant**:

```
Raw Credential / Sensitive Text
               │
               ▼
        Local Detection
 (DOM Scanner + Regex + NER + OCR + Face)
               │
               ▼
       Context Extraction
 (Variable Names, Input Roles, Form Labels)
               │
               ▼
      Semantic Placeholder
 (Context Preserved, Secret Cleared)
               │
               ▼
    Screenshot Pixel Redaction
 (Canvas Blackout with Luminance Verification)
               │
               ▼
   Fail-Closed Policy Validation
    (validatePayloadBeforeTransmission)
               │
       ┌───────┴───────┐
       ▼               ▼
    [SAFE]      [UNVERIFIED REGION / RAW LEAK]
       │               │
       │               ▼
       │      ABORT TRANSMISSION
       │     (POLICY_VIOLATION / 422)
       ▼
Transmit Sanitized Data to Backend
```

If privacy validation cannot establish payload safety, transmission is blocked with `POLICY_VIOLATION`. The tested execution path verified that raw sensitive test values were rejected before server processing.

---

## 2. Protected Categories & Semantic Placeholder Standard

The privacy pipeline transforms sensitive credentials into context-preserving semantic placeholders. This allows the reasoning backend to understand the schema and functional purpose of form elements without exposing actual secrets.

| Category | Detection Technique | Verification Algorithm | Semantic Placeholder (Current Standard) | Legacy Token (Deprecated) |
| :--- | :--- | :--- | :--- | :--- |
| **Passwords & PINs** | DOM input types, name/aria attributes | Keyword & entropy heuristics | `PASSWORD=YOUR_PASSWORD` | `[PASSWORD]` |
| **Aadhaar Numbers** | Regex (12 digits, non 0/1 lead) | **Verhoeff Checksum** | `AADHAAR=YOUR_AADHAAR_NUMBER` | `[AADHAAR]` |
| **PAN Cards** | Regex (`[A-Z]{5}[0-9]{4}[A-Z]`) | Official income tax format rules | `PAN=YOUR_PAN_NUMBER` | `[PAN]` |
| **Credit Cards** | Regex (Visa, MC, Amex, Discover) | **Luhn Checksum** | `CARD=YOUR_CARD_NUMBER` | `[CARD]` |
| **Bank IFSC Codes** | Regex (`^[A-Z]{4}0[A-Z0-9]{6}$`) | RBI specification | `IFSC=YOUR_IFSC_CODE` | `[IFSC]` |
| **Emails** | Strict RFC 5322 regex | Allowlist filter | `EMAIL=YOUR_EMAIL` | `[EMAIL]` |
| **Phones (IN & Global)** | International & E.164 patterns | Length & prefix bounds | `PHONE=YOUR_PHONE_NUMBER` | `[PHONE]` |
| **Google Maps API Key** | Prefix `AIzaSy...` regex | Shannon entropy check | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY` | `[API_KEY]` |
| **Supabase Project URL** | Regex on `.supabase.co` | Subdomain structure | `NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL` | `[SUPABASE_KEY]` |
| **Supabase Anon Key** | Prefix `sbp_...` or JWT | Shannon entropy | `NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY` | `[SUPABASE_KEY]` |
| **Service Role Secret** | Bearer JWT structure | JWT header/payload structure | `SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY` | `[JWT_SECRET]` |
| **Stripe Secret Key** | Prefix `sk_test_...` | Key structure validation | `STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY` | `[STRIPE_KEY]` |
| **Database URLs** | Protocol regex (postgres, mongo, redis) | Connection URI parser | `DATABASE_URL=YOUR_DATABASE_URL` | `[POSTGRES_URL]` |
| **Custom App Keys** | Generic secret assignment | Variable context extraction | `MY_API_KEY=YOUR_MY_API_KEY` | `[API_KEY]` |
| **Standalone JWT** | Three-part base64url regex | Algorithm header check | `YOUR_JWT_TOKEN` | `[JWT_SECRET]` |
| **Human Faces** | Client-side visual detection | Bounding box confidence | Canvas Pixel Blackout | `[FACE]` |

Safe structural configurations such as `NEXT_PUBLIC_API_URL=http://localhost:5000` contain no secrets and remain unchanged to ensure correct navigation and API host understanding.

### Context Preservation Example

```env
# RAW VALUE (Browser Environment Only)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBv1234567890abcdefGhIjKlMnOpQrS
DATABASE_URL=postgresql://dbuser:P@ssw0rd123@prod-cluster.internal:5432/app
EMAIL=user.demo@gov.in

# SERVER-VISIBLE VALUE (Transmitted to Backend)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
DATABASE_URL=YOUR_DATABASE_URL
EMAIL=YOUR_EMAIL
```

The variable name, structural syntax, and architectural context remain fully visible to the backend agent; the actual secret value does not.

---

## 3. Pixel-Level Screenshot Redaction

Redaction in the Privacy-Preserving Browser Vision Agent is not limited to DOM text:

1. **Safety Margin Padding**: Every detected sensitive bounding box receives a 4px perimeter safety margin (`padding: 4px`) to cover font anti-aliasing artifacts.
2. **Low-Luminance Fill**: Filled with solid `#050505` canvas fill style and bordered with `#1F2937`.
3. **Semantic Monospace Labeling**: Renders the corresponding semantic placeholder (e.g. `YOUR_API_KEY`) inside the blackout box.
4. **Automated Pixel Luminance Verification**: `verifyRegionRedacted` scans canvas pixel data inside each sensitive bounding box. If any pixel outside the label area exceeds a luminance threshold (>40), the region is marked unverified, and `validatePayloadBeforeTransmission` halts the pipeline.

---

## 4. Symbolic Credential Resolution (`valueRef`)

To guarantee that the backend never handles user credentials during form interactions:

1. When the agent decides to fill an email, password, or national ID field, the server returns an action specifying a symbolic reference rather than a literal string:
   ```json
   {
     "action": "type",
     "selector": "#login-password",
     "valueRef": "LOCAL_PASSWORD",
     "requiresConfirmation": true
   }
   ```
2. The browser-side `ActionExecutor` resolves the symbolic reference (`LOCAL_EMAIL`, `LOCAL_PASSWORD`, `LOCAL_AADHAAR`, `LOCAL_PAN`) from secure local storage (`chrome.storage.local`) only inside the browser tab.
3. The server runtime never receives, transmits, or logs the user's actual password or credentials.

---

## 5. Local Audit Log Verification

Every transmission event records an immutable entry into local extension storage:

```json
{
  "id": "audit-1773057600",
  "timestamp": 1773057600000,
  "url": "http://localhost:3000/portal",
  "detectionsCount": 4,
  "redactionsCount": 4,
  "rawPiiTransmitted": 0,
  "payloadSafe": true,
  "serverCalled": true,
  "actionsReceived": 2,
  "actionsExecuted": 1
}
```

The system enforces a fail-closed zero-raw-PII transmission invariant (`rawPiiTransmitted = 0`). The tested execution path verified that raw sensitive test values were rejected before server processing.
