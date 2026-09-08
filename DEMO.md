# Smart India Hackathon (SIH) Demonstration Walkthrough

## Privacy-Preserving Browser Vision Agent

This guide provides the complete, 15-step demonstration procedure for Smart India Hackathon evaluators and technical judges.

---

## 1. Preparation & Initialization

### Step 1: Build the Extension Artifacts
In the project root directory, compile the Webpack bundles and React popup:
```bash
npm run build:all
```
This produces production bundles inside `./build/` (manifest, content script, background service worker, and UI popup).

### Step 2: Load the Extension into Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click **Load unpacked**.
4. Select the `./build/` directory from this repository.
5. Verify the extension appears as **"Privacy Firewall" (v1.0.0)**.

### Step 3: Start the FastAPI AI Server
In a separate terminal, launch the Python backend:
```bash
python server/main.py
```
The server binds to `http://127.0.0.1:8000`.

### Step 4: Verify Server Health & Engine Readiness
Open your browser to `http://127.0.0.1:8000/health` or run `curl http://127.0.0.1:8000/health`.
Confirm the health response:
```json
{
  "status": "healthy",
  "service": "Privacy-Preserving Browser Vision Agent Server",
  "version": "1.0.0",
  "auth_enabled": false,
  "vlm_ready": true
}
```
*(Engine Status: Deterministic structured action planner active; neural VLM interface ready for optional attachment).*

---

## 2. Live In-Browser Execution

### Step 5: Open the Demonstration Test Page
In Chrome, navigate to the demonstration test file:
```
./build/test.html
```
*(Alternatively, serve the directory with `npx serve build` and navigate to `http://localhost:3000/test.html` or `http://localhost:3000/e2e_verify.html`)*.

### Step 6: Observe Real-Time Local Overlay Badges
Observe the live test page. High-contrast overlay badges appear directly over sensitive input fields and text nodes:
- **Red overlay**: Passwords, Aadhaar numbers, PAN cards
- **Blue overlay**: Email addresses (`rajesh.kumar@gov.in`)
- **Green overlay**: Indian & international phone numbers (`+91 9876543210`)
- **Purple overlay**: Credit cards (Luhn-verified) and bank IFSC codes
- **Orange overlay**: API keys, Supabase credentials, and JWT tokens

### Step 7: Explain Local Detection Mechanics to Judges
Highlight to evaluators:
- All detection was executed **100% locally** inside the browser content script and client workers.
- Zero network requests have left the browser.
- Verhoeff algorithms validated the Aadhaar numbers and Luhn algorithms checked credit card inputs locally.

### Step 8: Open Extension Popup & Navigate to Agent Tab
1. Click the Privacy Firewall puzzle piece / shield icon in Chrome's extension bar.
2. Select the **Agent** tab in the popup header.
3. Review the Agent Control Center display:
   - **Agent Status**: `Idle / Ready`
   - **Privacy Invariant**: `Fail-Closed Zero-Raw-PII Active`
   - **Backend Host**: `http://127.0.0.1:8000`

### Step 9: Trigger Page Analysis & Safe Action Planning
1. Enter a user objective into the task box:
   `"Sign in to the portal with verified credentials and submit"`
2. Click **"Analyze Page & Plan Safe Actions"**.
3. The content script orchestrates:
   - Viewport screenshot capture via `chrome.tabs.captureVisibleTab`.
   - Hybrid IoU spatial clustering of DOM and visual regions.
   - Semantic context preservation and canvas pixel-blackout redaction.
   - Fail-closed validation before network dispatch.

### Step 10: Demonstrate Canvas Visual Redaction
Display the internal redaction canvas:
- All sensitive regions are covered with solid `#050505` blackout rectangles.
- Monospace semantic labels (e.g. `YOUR_API_KEY`, `PASSWORD=YOUR_PASSWORD`) are rendered inside the blackout blocks.
- The automated pixel luminance check verifies zero text leakage before dispatch.

### Step 11: Show Sanitized Payload Preview
Show the judges the exact JSON payload dispatched to the backend:
- Screenshot: Pixels in sensitive bounding boxes are irreversibly blacked out.
- DOM Skeleton: Input values replaced with semantic placeholders (`EMAIL=YOUR_EMAIL`).
- Accessibility Tree: ARIA labels stripped of raw credentials.

### Step 12: Verify Zero-Raw-PII Transmission Scoreboard
Point evaluators to the **Privacy Scoreboard**:
```text
LOCAL DETECTIONS:     5 items detected locally
CANVAS REDACTIONS:    5 regions blacked out
TRANSMITTED:          Sanitized Screenshot, DOM Skeleton, A11y Tree
RAW PII TRANSMITTED:  0 (Verified in the demonstrated test path)
POLICY STATUS:        Fail-closed invariant satisfied
```

### Step 13: Review Structured Actions & Symbolic References
Inspect the action sequence returned by the server:
```json
[
  {
    "action": "type",
    "selector": "#email-input",
    "valueRef": "LOCAL_EMAIL",
    "requiresConfirmation": false
  },
  {
    "action": "type",
    "selector": "#password-input",
    "valueRef": "LOCAL_PASSWORD",
    "requiresConfirmation": true
  },
  {
    "action": "click",
    "selector": "#submit-btn",
    "requiresConfirmation": true
  }
]
```
Demonstrate that the server returned `LOCAL_PASSWORD` rather than the user's password. The credentials never left local browser memory.

### Step 14: Demonstrate In-DOM User Confirmation Dialog
1. Click **"Execute Next Action"** in the popup.
2. When the agent attempts to interact with the password field or submit button, an accessible in-DOM modal appears over the target page:
   - **"⚠️ Agent Action Confirmation Required"**
   - Displays intended target: `#password-input` / `#submit-btn`
   - User explicitly clicks **"Authorize Action"** (or denies).
3. Upon authorization, the action executes natively via trusted DOM event dispatch.

### Step 15: Inspect the Immutable Local Audit Log
1. In the extension popup, click the **Audit Log** tab.
2. Review the timestamped record:
   - Timestamp, URL, and action sequence.
   - Detections and redactions count.
   - Confirmation of `rawPiiTransmitted: 0` and `payloadSafe: true`.
3. Highlight that the audit log resides strictly in local browser storage (`chrome.storage.local`) for user review and compliance.
