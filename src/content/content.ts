/**
 * content.ts  — Content Script
 *
 * Injected into every page. Orchestrates all 10 pipeline steps.
 * Communicates with background service worker via chrome.runtime.sendMessage.
 */

import { DetectedItem, ExtensionMessage, ScanResult } from '../core/types';
import { computeRiskScore, generateId } from '../core/utils';
import { DetectionEngine } from '../detectors/detectionEngine';
import { renderOverlays, clearOverlays, redactItems, updateOverlayPositions } from './overlay';
import { buildSanitizedPayload } from '../sanitization/sanitizer';

let currentItems: DetectedItem[] = [];
let overlaysVisible = false;
let scanInProgress = false;

// ─── Listen for messages from background / popup ──────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    switch (message.type) {
      case 'SCAN_PAGE':
        runScan().then((result) => sendResponse({ result }));
        return true; // async

      case 'TOGGLE_OVERLAYS':
        if (overlaysVisible) {
          clearOverlays();
          overlaysVisible = false;
        } else {
          renderOverlays(currentItems);
          overlaysVisible = true;
        }
        sendResponse({ overlaysVisible });
        break;

      case 'CLEAR_OVERLAYS':
        clearOverlays();
        overlaysVisible = false;
        sendResponse({ ok: true });
        break;

      case 'REDACT_ITEM': {
        const item = currentItems.find((i) => i.id === (message.payload as any)?.id);
        if (item) redactItems([item]);
        sendResponse({ ok: true });
        break;
      }
    }
  }
);

// ─── Main scan pipeline ───────────────────────────────────────────────────────

async function runScan(): Promise<ScanResult> {
  if (scanInProgress) {
    return buildResult(currentItems);
  }
  scanInProgress = true;

  try {
    const engine = new DetectionEngine();
    currentItems = await engine.run();

    // Auto-redact high-confidence items
    const highConfidence = currentItems.filter((i) => i.confidence >= 0.95);
    if (highConfidence.length > 0) {
      redactItems(highConfidence);
      highConfidence.forEach((i) => (i.status = 'redacted'));
    }

    // Render overlays
    renderOverlays(currentItems);
    overlaysVisible = true;

    const result = buildResult(currentItems);

    // Notify background to update badge
    chrome.runtime.sendMessage({
      type: 'SCAN_COMPLETE',
      payload: result,
    } as ExtensionMessage);

    return result;
  } finally {
    scanInProgress = false;
  }
}

function buildResult(items: DetectedItem[]): ScanResult {
  return {
    url: window.location.href,
    tabId: 0, // filled by background
    timestamp: Date.now(),
    items,
    riskScore: computeRiskScore(items),
    sanitizedPayload: buildSanitizedPayload(items) as Record<string, string>,
  };
}

// ─── Update overlay positions on scroll/resize ───────────────────────────────

window.addEventListener('scroll', () => {
  if (overlaysVisible) updateOverlayPositions(currentItems);
}, { passive: true });

window.addEventListener('resize', () => {
  if (overlaysVisible) updateOverlayPositions(currentItems);
}, { passive: true });

// ─── Auto-scan on page load ───────────────────────────────────────────────────

if (document.readyState === 'complete') {
  runScan();
} else {
  window.addEventListener('load', () => runScan(), { once: true });
}
