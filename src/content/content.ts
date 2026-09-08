/**
 * content.ts  — Content Script
 *
 * Injected into every page. Full pipeline:
 *  1. Auto-scan on page load
 *  2. MutationObserver for incremental re-scan of changed DOM regions
 *  3. Overlay rendering
 *  4. Network guard (fetch + XHR intercept)
 *  5. Communicates with background service worker via chrome.runtime.sendMessage
 */

import {
  DetectedItem,
  ExtensionMessage,
  ScanResult,
  ScanMetrics,
  AgentAction,
  AnalyzeRequest,
  SensitiveRegion,
} from '../core/types';
import { computeRiskScore, generateId } from '../core/utils';
import { DetectionEngine } from '../detectors/detectionEngine';
import {
  renderOverlays,
  clearOverlays,
  redactItems,
  updateOverlayPositions,
  isCurrentlyRedacting,
} from './overlay';
import { buildSanitizedPayload } from '../sanitization/sanitizer';
import { installNetworkGuard, installXhrGuard } from '../network/networkGuard';
import { ActionExecutor } from '../actions/actionExecutor';
import { fuseDetections } from '../privacy/hybridFusion';
import { redactScreenshot } from '../privacy/screenshotRedactor';
import { buildA11yTree } from '../overlays/accessibilityTree';
import { buildDomSkeleton } from '../overlays/domSkeleton';
import { evaluatePrivacyPolicy } from '../privacy/policyEngine';

// ─── State ───────────────────────────────────────────────────────────────────

let currentItems: DetectedItem[] = [];
let overlaysVisible = false;
let scanInProgress = false;
let mutationObserver: MutationObserver | null = null;
const actionExecutor = new ActionExecutor();
let latestSensitiveRegions: SensitiveRegion[] = [];

// Throttle incremental re-scans to at most once per 800ms
let rescanTimer: ReturnType<typeof setTimeout> | null = null;
const RESCAN_DEBOUNCE_MS = 800;

// Track nodes that have changed since last scan (for incremental mode)
let changedRoots = new Set<Element>();

// ─── Install network guards immediately (before any requests fire) ────────────

installNetworkGuard(() => currentItems);
installXhrGuard(() => currentItems);

// ─── Listen for messages from background / popup ──────────────────────────────

if (typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    switch (message.type) {
      case 'SCAN_PAGE':
        // Full scan requested by user (from popup)
        runFullScan().then((result) => sendResponse({ result }));
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
        const item = currentItems.find((i) => i.id === (message.payload as { id: string })?.id);
        if (item) {
          redactItems([item]);
          item.status = 'redacted';
        }
        sendResponse({ ok: true });
        break;
      }

      case 'EXECUTE_ACTION': {
        const action = message.payload as AgentAction;
        actionExecutor.execute(action, latestSensitiveRegions).then((result) => {
          sendResponse({ ok: result.success, result });
        });
        return true;
      }

      case 'ANALYZE_PAGE': {
        runAgentPipeline(message.payload as { taskDescription?: string }).then((res) => {
          sendResponse(res);
        });
        return true;
      }
    }
  }
);
}

// ─── Full scan pipeline ───────────────────────────────────────────────────────

async function runFullScan(): Promise<ScanResult> {
  if (scanInProgress) return buildResult(currentItems);
  scanInProgress = true;
  changedRoots.clear();

  const totalStart = performance.now();

  try {
    const engine = new DetectionEngine();
    const metrics = await engine.runWithMetrics();
    currentItems = metrics.items;

    applyAutoRedact(currentItems);

    const overlayStart = performance.now();
    renderOverlays(currentItems);
    overlaysVisible = true;
    const overlayRenderMs = performance.now() - overlayStart;

    const totalMs = performance.now() - totalStart;
    const scanMetrics: ScanMetrics = {
      ...metrics.timing,
      overlayRenderMs: Math.round(overlayRenderMs * 10) / 10,
      totalMs: Math.round(totalMs * 10) / 10,
    };

    const result = buildResult(currentItems, scanMetrics);
    notifyBackground(result);
    return result;
  } finally {
    scanInProgress = false;
  }
}

// ─── Incremental scan — only re-scan nodes that changed ─────────────────────

async function runIncrementalScan() {
  if (scanInProgress || changedRoots.size === 0) return;
  scanInProgress = true;

  const roots = Array.from(changedRoots);
  changedRoots.clear();

  try {
    const engine = new DetectionEngine();
    const newItems = await engine.runOnRoots(roots);

    // Merge new items into currentItems, replacing items from the same roots
    // Remove stale items whose element is inside one of the changed roots
    const unchanged = currentItems.filter((item) => {
      if (!item.location.selector) return true;
      try {
        const el = document.querySelector(item.location.selector);
        if (!el) return false; // element gone — remove
        return !roots.some((root) => root.contains(el));
      } catch {
        return false;
      }
    });

    currentItems = [...unchanged, ...newItems];

    // Deduplicate by type+value
    const seen = new Set<string>();
    currentItems = currentItems.filter((item) => {
      const key = `${item.type}:${item.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    applyAutoRedact(newItems);
    if (overlaysVisible) renderOverlays(currentItems);

    const result = buildResult(currentItems);
    notifyBackground(result);
  } finally {
    scanInProgress = false;
  }
}

// ─── Auto-redact high-confidence items ───────────────────────────────────────

function applyAutoRedact(items: DetectedItem[]) {
  const high = items.filter((i) => i.confidence >= 0.95 && i.status === 'detected');
  if (high.length > 0) {
    redactItems(high);
    high.forEach((i) => (i.status = 'redacted'));
  }
}

// ─── Notify background service worker ────────────────────────────────────────

function notifyBackground(result: ScanResult) {
  try {
    chrome.runtime.sendMessage({
      type: 'SCAN_COMPLETE',
      payload: result,
    } as ExtensionMessage);
  } catch {
    // Extension context may be invalidated on navigation
  }
}

// ─── Build ScanResult from current items ─────────────────────────────────────

function buildResult(items: DetectedItem[], metrics?: ScanMetrics): ScanResult {
  return {
    url: window.location.href,
    tabId: 0, // filled by background
    timestamp: Date.now(),
    items,
    riskScore: computeRiskScore(items),
    sanitizedPayload: buildSanitizedPayload(items) as Record<string, string>,
    metrics,
  };
}

// ─── MutationObserver — incremental re-scan on DOM change ────────────────────

function startMutationObserver() {
  if (mutationObserver) return;

  mutationObserver = new MutationObserver((mutations) => {
    if (isCurrentlyRedacting()) return;

    for (const mutation of mutations) {
      // Skip overlay mutations (avoid feedback loops)
      const target = mutation.target as Element;
      if (
        target.id === '__pf_overlay_root__' ||
        (target instanceof Element && target.closest('#__pf_overlay_root__'))
      ) {
        continue;
      }

      // Track the root-level changed element for incremental scanning
      const root = (mutation.target as Element).closest
        ? (mutation.target as Element).closest('form, section, article, main, [role], div') ??
          document.body
        : document.body;

      changedRoots.add(root as Element);
    }

    // Debounce so we don't re-scan on every keystroke
    if (changedRoots.size > 0) {
      if (rescanTimer) clearTimeout(rescanTimer);
      rescanTimer = setTimeout(() => {
        runIncrementalScan();
      }, RESCAN_DEBOUNCE_MS);
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['value', 'placeholder', 'src'],
  });
}

function stopMutationObserver() {
  mutationObserver?.disconnect();
  mutationObserver = null;
  if (rescanTimer) {
    clearTimeout(rescanTimer);
    rescanTimer = null;
  }
}

// ─── Update overlay positions on scroll/resize ───────────────────────────────

window.addEventListener('scroll', () => {
  if (overlaysVisible) updateOverlayPositions(currentItems);
}, { passive: true });

window.addEventListener('resize', () => {
  if (overlaysVisible) updateOverlayPositions(currentItems);
}, { passive: true });

// ─── Re-scan on URL change (SPA navigation) ──────────────────────────────────

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    clearOverlays();
    currentItems = [];
    overlaysVisible = false;
    // Give SPA time to render
    setTimeout(() => runFullScan(), 1200);
  }
}).observe(document, { subtree: true, childList: true });

// ─── Auto-scan on page load ───────────────────────────────────────────────────

async function init() {
  await runFullScan();
  startMutationObserver();
}

if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', () => init(), { once: true });
}

// ─── Cleanup on unload ───────────────────────────────────────────────────────

window.addEventListener('pagehide', () => {
  stopMutationObserver();
  clearOverlays();
}, { once: true });

// ─── Vision Agent Pipeline Execution ──────────────────────────────────────────

export async function runAgentPipeline(options?: { taskDescription?: string }): Promise<{
  ok: boolean;
  error?: string;
  sanitizedScreenshot?: string;
  sensitiveRegions?: SensitiveRegion[];
  actions?: AgentAction[];
  reasoning?: string;
}> {
  try {
    if (currentItems.length === 0) {
      await runFullScan();
    }

    // Capture tab screenshot via background
    const screenshotRes = await new Promise<{ ok: boolean; dataUrl?: string; error?: string }>((resolve) => {
      chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (res) => {
        resolve(res || { ok: false, error: 'No response from background' });
      });
    });

    if (!screenshotRes.ok || !screenshotRes.dataUrl) {
      throw new Error(`Screenshot capture failed: ${screenshotRes.error || 'Empty screenshot'}`);
    }

    // Multi-modal hybrid fusion
    latestSensitiveRegions = fuseDetections(currentItems, [], []);

    // Pixel-level screenshot redaction (blackout default)
    const redactionRes = await redactScreenshot(
      screenshotRes.dataUrl,
      latestSensitiveRegions,
      'blackout'
    );

    // Build sanitized accessibility tree & DOM skeleton
    const a11yTree = buildA11yTree(document.body, latestSensitiveRegions);
    const domSkeleton = buildDomSkeleton(document.body, latestSensitiveRegions);

    const cleanUrl = window.location.origin + window.location.pathname;
    const analyzeRequest: AnalyzeRequest = {
      screenshot: redactionRes.redactedDataUrl,
      accessibilityTree: a11yTree,
      domStructure: domSkeleton,
      ocrText: '',
      url: cleanUrl,
      taskDescription: options?.taskDescription || 'Analyze active page and plan next safe action',
      timestamp: Date.now(),
    };

    // Fail-Closed Privacy Policy Evaluation
    const policyResult = evaluatePrivacyPolicy(analyzeRequest, latestSensitiveRegions);
    if (!policyResult.safe) {
      const errorMsg = `BLOCKED: POLICY_VIOLATION - ${policyResult.violations.join('; ')}`;
      console.error('[PrivacyFirewall]', errorMsg);
      return {
        ok: false,
        error: errorMsg,
        sanitizedScreenshot: redactionRes.redactedDataUrl,
        sensitiveRegions: latestSensitiveRegions,
      };
    }

    // Send sanitized payload to background -> FastAPI server
    const serverRes = await new Promise<{ ok: boolean; response?: any; error?: string }>((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'ANALYZE_PAGE', payload: analyzeRequest },
        (res) => {
          resolve(res || { ok: false, error: 'No response from server' });
        }
      );
    });

    if (!serverRes.ok) {
      return {
        ok: false,
        error: serverRes.error || 'Server error',
        sanitizedScreenshot: redactionRes.redactedDataUrl,
        sensitiveRegions: latestSensitiveRegions,
      };
    }

    return {
      ok: true,
      sanitizedScreenshot: redactionRes.redactedDataUrl,
      sensitiveRegions: latestSensitiveRegions,
      actions: serverRes.response?.actions || [],
      reasoning: serverRes.response?.reasoning || '',
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

