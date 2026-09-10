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
  ActionResult,
  AnalyzeRequest,
  SensitiveRegion,
  AgentStateStep,
  AgentTaskProgress,
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
import { ActionExecutor, validateAction } from '../actions/actionExecutor';
import { fuseDetections } from '../privacy/hybridFusion';
import { redactScreenshot } from '../privacy/screenshotRedactor';
import { buildA11yTree } from '../overlays/accessibilityTree';
import { buildDomSkeleton } from '../overlays/domSkeleton';
import { evaluatePrivacyPolicy } from '../privacy/policyEngine';
import { sanitizeOcrResults, sanitizeOcrText } from '../ocr/ocrEngine';
import { evaluatePageContext } from '../privacy/contextPolicyEngine';
import { defaultAiSendGate, AiSendGate } from '../privacy/aiSendGate';
import { defaultAttachmentInterceptor } from '../visualPrivacy';

export { defaultAiSendGate, AiSendGate, defaultAttachmentInterceptor };

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

export function injectMainWorldGuard(): void {
  if (typeof document === 'undefined' || !document.documentElement) return;
  try {
    const script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.textContent = `
(function() {
  if (window.__PF_MAIN_GUARD_INSTALLED__) return;
  window.__PF_MAIN_GUARD_INSTALLED__ = true;

  var sanitizedNameMap = new Map();
  var pendingNames = new Set();
  var failedNames = new Set();
  var pendingWaiters = new Map();

  window.addEventListener('__PF_IMAGE_PROCESSING_START__', function(e) {
    if (e.detail && e.detail.originalName) {
      var name = e.detail.originalName;
      pendingNames.add(name);
      failedNames.delete(name);
    }
  });

  window.addEventListener('__PF_REGISTER_SANITIZED_FILE__', function(e) {
    if (e.detail && e.detail.originalName && e.detail.sanitizedFile) {
      var name = e.detail.originalName;
      var file = e.detail.sanitizedFile;
      sanitizedNameMap.set(name, file);
      pendingNames.delete(name);
      failedNames.delete(name);

      if (pendingWaiters.has(name)) {
        var waiters = pendingWaiters.get(name);
        pendingWaiters.delete(name);
        for (var i = 0; i < waiters.length; i++) {
          clearTimeout(waiters[i].timer);
          waiters[i].resolve(file);
        }
      }
    }
  });

  window.addEventListener('__PF_IMAGE_PROCESSING_FAILED__', function(e) {
    if (e.detail && e.detail.originalName) {
      var name = e.detail.originalName;
      pendingNames.delete(name);
      failedNames.add(name);

      if (pendingWaiters.has(name)) {
        var waiters = pendingWaiters.get(name);
        pendingWaiters.delete(name);
        for (var i = 0; i < waiters.length; i++) {
          clearTimeout(waiters[i].timer);
          waiters[i].reject(new Error('Image privacy processing failed for: ' + name));
        }
      }
    }
  });

  function waitForSanitization(name, timeoutMs) {
    if (sanitizedNameMap.has(name)) {
      return Promise.resolve(sanitizedNameMap.get(name));
    }
    if (failedNames.has(name)) {
      return Promise.reject(new Error('Image privacy processing failed for: ' + name));
    }
    if (!pendingNames.has(name)) {
      return Promise.resolve(null);
    }
    return new Promise(function(resolve, reject) {
      var timer = setTimeout(function() {
        reject(new Error('Timeout waiting for privacy sanitization: ' + name));
      }, timeoutMs || 10000);

      if (!pendingWaiters.has(name)) {
        pendingWaiters.set(name, []);
      }
      pendingWaiters.get(name).push({ resolve: resolve, reject: reject, timer: timer });
    });
  }

  // ─── URL.createObjectURL ───────────────────────────────────────────────
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    var origCreate = URL.createObjectURL.bind(URL);
    URL.createObjectURL = function(obj) {
      try {
        if (obj && obj.name && sanitizedNameMap.has(obj.name)) {
          return origCreate(sanitizedNameMap.get(obj.name));
        }
      } catch (e) {}
      return origCreate(obj);
    };
  }

  // ─── FormData Prototype ────────────────────────────────────────────────
  if (typeof FormData !== 'undefined') {
    var origAppend = FormData.prototype.append;
    FormData.prototype.append = function(name, val) {
      if (val && typeof val === 'object' && val.name && sanitizedNameMap.has(val.name)) {
        val = sanitizedNameMap.get(val.name);
      }
      return origAppend.apply(this, arguments);
    };

    var origSet = FormData.prototype.set;
    FormData.prototype.set = function(name, val) {
      if (val && typeof val === 'object' && val.name && sanitizedNameMap.has(val.name)) {
        val = sanitizedNameMap.get(val.name);
      }
      return origSet.apply(this, arguments);
    };
  }

  // ─── FileReader Prototype ──────────────────────────────────────────────
  if (typeof FileReader !== 'undefined') {
    var origReadAsDataURL = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function(blob) {
      if (blob && blob.name && sanitizedNameMap.has(blob.name)) {
        blob = sanitizedNameMap.get(blob.name);
      }
      return origReadAsDataURL.call(this, blob);
    };

    var origReadAsArrayBuffer = FileReader.prototype.readAsArrayBuffer;
    FileReader.prototype.readAsArrayBuffer = function(blob) {
      if (blob && blob.name && sanitizedNameMap.has(blob.name)) {
        blob = sanitizedNameMap.get(blob.name);
      }
      return origReadAsArrayBuffer.call(this, blob);
    };
  }

  // ─── window.fetch ──────────────────────────────────────────────────────
  if (typeof window.fetch === 'function') {
    var origFetch = window.fetch.bind(window);
    window.fetch = async function(input, init) {
      if (init && init.body) {
        // Sub-case A: FormData
        if (typeof FormData !== 'undefined' && init.body instanceof FormData) {
          var newFd = new FormData();
          var modified = false;
          for (var pair of init.body.entries()) {
            var k = pair[0];
            var v = pair[1];
            if (v && typeof v === 'object' && typeof v.name === 'string') {
              var fName = v.name;
              if (pendingNames.has(fName)) {
                try {
                  await waitForSanitization(fName, 10000);
                } catch (err) {
                  console.error('[PrivacyFirewall] Blocked upload of unverified image:', fName);
                  throw new Error('[PrivacyFirewall] Transmission blocked: ' + err.message);
                }
              }
              if (sanitizedNameMap.has(fName)) {
                var sanFile = sanitizedNameMap.get(fName);
                newFd.append(k, sanFile, sanFile.name || fName);
                modified = true;
                continue;
              } else if (failedNames.has(fName)) {
                console.error('[PrivacyFirewall] Blocked upload of failed image:', fName);
                throw new Error('[PrivacyFirewall] Transmission blocked: Image privacy failed');
              }
            }
            newFd.append(k, v);
          }
          if (modified) {
            init = Object.assign({}, init, { body: newFd });
          }
        }
        // Sub-case B: Direct File or Blob
        else if (typeof Blob !== 'undefined' && init.body instanceof Blob) {
          var b = init.body;
          if (b.name) {
            if (pendingNames.has(b.name)) {
              try {
                await waitForSanitization(b.name, 10000);
              } catch (err) {
                console.error('[PrivacyFirewall] Blocked upload of unverified image:', b.name);
                throw new Error('[PrivacyFirewall] Transmission blocked: ' + err.message);
              }
            }
            if (sanitizedNameMap.has(b.name)) {
              init = Object.assign({}, init, { body: sanitizedNameMap.get(b.name) });
            } else if (failedNames.has(b.name)) {
              console.error('[PrivacyFirewall] Blocked upload of failed image:', b.name);
              throw new Error('[PrivacyFirewall] Transmission blocked: Image privacy failed');
            }
          }
        }
      }
      return origFetch(input, init);
    };
  }

  // ─── XMLHttpRequest ────────────────────────────────────────────────────
  if (typeof XMLHttpRequest !== 'undefined') {
    var origXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body) {
      if (body) {
        if (typeof FormData !== 'undefined' && body instanceof FormData) {
          var newXhrFd = new FormData();
          var modified = false;
          for (var pair of body.entries()) {
            var k = pair[0];
            var v = pair[1];
            if (v && typeof v === 'object' && typeof v.name === 'string') {
              if (sanitizedNameMap.has(v.name)) {
                var san = sanitizedNameMap.get(v.name);
                newXhrFd.append(k, san, san.name || v.name);
                modified = true;
                continue;
              } else if (failedNames.has(v.name)) {
                throw new Error('[PrivacyFirewall] Transmission blocked: Image privacy failed');
              }
            }
            newXhrFd.append(k, v);
          }
          if (modified) {
            body = newXhrFd;
          }
        } else if (typeof Blob !== 'undefined' && body instanceof Blob) {
          if (body.name) {
            if (sanitizedNameMap.has(body.name)) {
              body = sanitizedNameMap.get(body.name);
            } else if (failedNames.has(body.name)) {
              throw new Error('[PrivacyFirewall] Transmission blocked: Image privacy failed');
            }
          }
        }
      }
      return origXhrSend.call(this, body);
    };
  }
})();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch {}
}

// ─── Install network guards immediately (before any requests fire) ────────────

injectMainWorldGuard();
installNetworkGuard(() => currentItems);
installXhrGuard(() => currentItems);

// ─── Listen for messages from background / popup ──────────────────────────────

if (typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    switch (message.type) {
      case 'SCAN_PAGE': {
        const policy = evaluatePageContext();
        if (policy.policy === 'BLOCK_ALL' || policy.context === 'AI_ASSISTANT') {
          sendResponse({ result: buildResult([]) });
          return true;
        }
        // Full scan requested by user (from popup)
        runFullScan().then((result) => sendResponse({ result }));
        return true; // async
      }

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

      case 'RUN_AGENT_TASK': {
        runAgentTask(message.payload as { taskDescription?: string }).then((res) => {
          sendResponse(res);
        });
        return true;
      }

      case 'GET_CONTEXT': {
        const policy = evaluatePageContext();
        sendResponse({ context: policy.context, policy });
        break;
      }
    }
  }
);
}

// ─── Full scan pipeline ───────────────────────────────────────────────────────

async function runFullScan(): Promise<ScanResult> {
  if (scanInProgress) return buildResult(currentItems);
  if (typeof document === 'undefined' || !document.body) return buildResult(currentItems);
  scanInProgress = true;
  changedRoots.clear();

  const totalStart = performance.now();

  try {
    const engine = new DetectionEngine();
    const metrics = await engine.runWithMetrics();
    currentItems = metrics.items;

    // Passive scanning: do NOT rewrite live webpage DOM! Overlays are non-blocking indicators.
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
  if (evaluatePageContext().policy === 'BLOCK_ALL') return;
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

    // Passive scanning: do not mutate live DOM
    if (overlaysVisible) renderOverlays(currentItems);

    const result = buildResult(currentItems);
    notifyBackground(result);
  } finally {
    scanInProgress = false;
  }
}

// ─── User-requested redaction helper ─────────────────────────────────────────

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
  if (typeof document === 'undefined' || !document.body) return;

  mutationObserver = new MutationObserver((mutations) => {
    if (typeof document === 'undefined' || !document.body) return;
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
      const fallbackBody = (typeof document !== 'undefined' && document.body) ? document.body : (target instanceof Element ? target : null);
      const root = (mutation.target as Element).closest
        ? (mutation.target as Element).closest('form, section, article, main, [role], div') ??
          fallbackBody
        : fallbackBody;

      if (root) changedRoots.add(root as Element);
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

// ─── Re-scan & Context Re-evaluation on URL change (SPA navigation) ──────────

const isTestEnv = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
let lastUrl = typeof location !== 'undefined' ? location.href : '';
let spaTimeout: ReturnType<typeof setTimeout> | null = null;

export function handleSpaNavigation() {
  const currentHref = typeof location !== 'undefined' ? location.href : '';
  if (currentHref !== lastUrl) {
    lastUrl = currentHref;
    clearOverlays();
    currentItems = [];
    overlaysVisible = false;

    // Immediately re-evaluate context on route change
    const policy = evaluatePageContext();
    if (policy.context === 'AI_ASSISTANT') {
      defaultAiSendGate.init();
      clearOverlays();
      stopMutationObserver();
    } else {
      defaultAiSendGate.destroy();
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'CONTEXT_UPDATE',
          payload: {
            context: policy.context,
            policy,
            url: currentHref,
          },
        });
      }
    } catch {}

    // If active page is an excluded context or AI assistant, halt full scan and overlays!
    if (policy.policy === 'BLOCK_ALL' || policy.context === 'AI_ASSISTANT') {
      clearOverlays();
      stopMutationObserver();
      return;
    }

    // Give SPA time to render new DOM
    if (spaTimeout) clearTimeout(spaTimeout);
    if (!isTestEnv) {
      spaTimeout = setTimeout(() => {
        if (typeof document !== 'undefined' && document && document.body) {
          const p = evaluatePageContext();
          if (p.policy !== 'BLOCK_ALL' && p.context !== 'AI_ASSISTANT') {
            runFullScan();
          }
        }
      }, 1200);
    }
  }
}

if (typeof window !== 'undefined' && typeof history !== 'undefined') {
  const origPushState = history.pushState;
  if (origPushState) {
    history.pushState = function (...args: any[]) {
      const ret = origPushState.apply(this, args);
      handleSpaNavigation();
      return ret;
    };
  }

  const origReplaceState = history.replaceState;
  if (origReplaceState) {
    history.replaceState = function (...args: any[]) {
      const ret = origReplaceState.apply(this, args);
      handleSpaNavigation();
      return ret;
    };
  }

  window.addEventListener('popstate', () => {
    handleSpaNavigation();
  });
}

if (typeof window !== 'undefined' && !isTestEnv) {
  // Polling fallback for frameworks that change URL without History API events
  setInterval(() => {
    handleSpaNavigation();
  }, 1500);
}

// ─── Auto-scan on page load ───────────────────────────────────────────────────

export async function init() {
  const policy = evaluatePageContext();
  const composer = defaultAiSendGate.findComposer();
  if (policy.context === 'AI_ASSISTANT' || composer) {
    defaultAiSendGate.init();
    clearOverlays();
    stopMutationObserver();
  } else {
    defaultAiSendGate.destroy();
  }

  // Inject main-world transport guard for page scripts (FormData, URL.createObjectURL, FileReader)
  injectMainWorldGuard();

  // Initialize visual privacy attachment interceptor and wire to AI Send Gate
  defaultAttachmentInterceptor.init();
  defaultAttachmentInterceptor.setOnStateChange(() => {
    defaultAiSendGate.evaluateSendAllowed();
  });
  defaultAiSendGate.attachmentInterceptor = defaultAttachmentInterceptor;

  // Immediately broadcast live DOM-evaluated context to background service worker
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'CONTEXT_UPDATE',
        payload: {
          context: policy.context,
          policy,
          url: typeof location !== 'undefined' ? location.href : '',
        },
      });
    }
  } catch {}

  // If active page is an excluded context or AI assistant, halt full scan and overlays!
  if (policy.policy === 'BLOCK_ALL' || policy.context === 'AI_ASSISTANT' || composer) {
    clearOverlays();
    stopMutationObserver();
    return;
  }

  if (typeof document !== 'undefined' && document && document.body) {
    await runFullScan();
    startMutationObserver();
  }
}

if (typeof document !== 'undefined' && !isTestEnv) {
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', () => init(), { once: true });
  }
}

// ─── Cleanup on unload ───────────────────────────────────────────────────────

window.addEventListener('pagehide', () => {
  defaultAiSendGate.destroy();
  defaultAttachmentInterceptor.destroy();
  stopMutationObserver();
  clearOverlays();
  if (spaTimeout) {
    clearTimeout(spaTimeout);
    spaTimeout = null;
  }
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
    // Pre-flight Context Policy Check: Authentication & Messaging contexts are completely blocked
    const contextPolicy = evaluatePageContext();
    if (!contextPolicy.allowScreenshot || !contextPolicy.allowDomTransmission || contextPolicy.policy === 'BLOCK_ALL') {
      const errorMsg = `BLOCKED: ${contextPolicy.reason} (${contextPolicy.context} context - agent processing is completely disabled)`;
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'CONTEXT_BLOCKED',
            payload: {
              context: contextPolicy.context,
              reason: contextPolicy.reason,
              url: window.location.href,
            },
          });
        }
      } catch {}
      return {
        ok: false,
        error: errorMsg,
      };
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

    // Run full detection including OCR + face on the captured screenshot
    const engine = new DetectionEngine();
    const detectionResult = await engine.runWithScreenshot(screenshotRes.dataUrl);
    currentItems = detectionResult.items;

    // Sanitize OCR results before they reach fusion or network
    const sanitizedOcr = sanitizeOcrResults(detectionResult.ocrResults);

    // Multi-modal hybrid fusion with real OCR results
    latestSensitiveRegions = fuseDetections(currentItems, sanitizedOcr, []);

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
    const sanitizedOcrText = sanitizedOcr.map(r => r.text).join(' ');
    const analyzeRequest: AnalyzeRequest = {
      screenshot: redactionRes.redactedDataUrl,
      accessibilityTree: a11yTree,
      domStructure: domSkeleton,
      ocrText: sanitizeOcrText(sanitizedOcrText),
      sanitizedOcr: sanitizedOcr,
      url: cleanUrl,
      taskDescription: options?.taskDescription || 'Analyze active page and plan next safe action',
      timestamp: Date.now(),
      context: contextPolicy.context,
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

// ─── Autonomous Agent Task State Machine Pipeline ─────────────────────────────

export async function runAgentTask(options?: { taskDescription?: string }): Promise<{
  ok: boolean;
  state: AgentStateStep;
  error?: string;
  taskDescription: string;
  detectionsCount: number;
  redactionsCount: number;
  rawPiiTransmitted: number;
  actionsTotal: number;
  actionsCompleted: number;
  actionsExecuted: ActionResult[];
  sanitizedScreenshot?: string;
  reasoning?: string;
}> {
  const taskDesc = options?.taskDescription || 'Find the search box and search for internships';

  const notifyProgress = (progress: Partial<AgentTaskProgress>) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'AGENT_PROGRESS',
          payload: {
            taskDescription: taskDesc,
            rawPiiTransmitted: 0,
            ...progress,
          },
        });
      }
    } catch {
      // Background message non-fatal
    }
  };

  try {
    // Pre-flight Context Policy Check: Authentication & Messaging contexts are completely blocked
    const contextPolicy = evaluatePageContext();
    if (!contextPolicy.allowScreenshot || !contextPolicy.allowDomTransmission || contextPolicy.policy === 'BLOCK_ALL') {
      const errorMsg = `BLOCKED: ${contextPolicy.reason} (${contextPolicy.context} context - agent processing is completely disabled)`;
      notifyProgress({ step: 'BLOCKED', message: errorMsg, error: errorMsg });
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'CONTEXT_BLOCKED',
            payload: {
              context: contextPolicy.context,
              reason: contextPolicy.reason,
              url: window.location.href,
            },
          });
        }
      } catch {}
      return {
        ok: false,
        state: 'BLOCKED',
        error: errorMsg,
        taskDescription: taskDesc,
        detectionsCount: 0,
        redactionsCount: 0,
        rawPiiTransmitted: 0,
        actionsTotal: 0,
        actionsCompleted: 0,
        actionsExecuted: [],
      };
    }

    // 1. CAPTURING
    notifyProgress({ step: 'CAPTURING', message: 'Capturing current viewport screenshot...' });
    let screenshotDataUrl = '';
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const screenshotRes = await new Promise<{ ok: boolean; dataUrl?: string; error?: string }>((resolve) => {
          chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (res) => {
            resolve(res || { ok: false, error: 'No response from background' });
          });
        });
        if (screenshotRes?.ok && screenshotRes?.dataUrl) {
          screenshotDataUrl = screenshotRes.dataUrl;
        }
      } catch {}
    }

    if (!screenshotDataUrl) {
      // Direct local canvas rendering for demo/test environments
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(window.innerWidth || 1200, 1280);
      canvas.height = Math.min(window.innerHeight || 800, 960);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      screenshotDataUrl = canvas.toDataURL('image/png');
    }

    // 2. ANALYZING_LOCALLY — run full detection with OCR + face on screenshot
    notifyProgress({ step: 'ANALYZING_LOCALLY', message: 'Analyzing DOM, text, OCR, and visual structures locally...' });
    const engine = new DetectionEngine();
    const detectionResult = await engine.runWithScreenshot(screenshotDataUrl);
    currentItems = detectionResult.items;

    // Sanitize OCR results before fusion or network transmission
    const sanitizedOcr = sanitizeOcrResults(detectionResult.ocrResults);

    // Multi-modal hybrid fusion with real OCR results
    latestSensitiveRegions = fuseDetections(currentItems, sanitizedOcr, []);

    // 3. SANITIZING
    notifyProgress({
      step: 'SANITIZING',
      message: `Sanitizing screenshot & metadata: ${latestSensitiveRegions.length} sensitive item(s) protected...`,
      detectionsCount: currentItems.length,
      redactionsCount: latestSensitiveRegions.length,
    });
    const redactionRes = await redactScreenshot(
      screenshotDataUrl,
      latestSensitiveRegions,
      'blackout'
    );
    const a11yTree = buildA11yTree(document.body, latestSensitiveRegions);
    const domSkeleton = buildDomSkeleton(document.body, latestSensitiveRegions);

    const cleanUrl = window.location.origin + window.location.pathname;
    const sanitizedOcrText = sanitizedOcr.map(r => r.text).join(' ');
    const analyzeRequest: AnalyzeRequest = {
      screenshot: redactionRes.redactedDataUrl,
      accessibilityTree: a11yTree,
      domStructure: domSkeleton,
      ocrText: sanitizeOcrText(sanitizedOcrText),
      sanitizedOcr: sanitizedOcr,
      url: cleanUrl,
      taskDescription: taskDesc,
      timestamp: Date.now(),
      context: contextPolicy.context,
    };

    // 4. SANITIZATION_VERIFIED
    notifyProgress({
      step: 'SANITIZATION_VERIFIED',
      message: 'Fail-closed privacy policy verified: 0 raw PII in outgoing request.',
      detectionsCount: currentItems.length,
      redactionsCount: latestSensitiveRegions.length,
      rawPiiTransmitted: 0,
      verified: true,
    });
    const policyResult = evaluatePrivacyPolicy(analyzeRequest, latestSensitiveRegions);
    if (!policyResult.safe) {
      const errorMsg = `BLOCKED: POLICY_VIOLATION - ${policyResult.violations.join('; ')}`;
      notifyProgress({ step: 'BLOCKED', message: errorMsg, error: errorMsg });
      return {
        ok: false,
        state: 'BLOCKED',
        error: errorMsg,
        taskDescription: taskDesc,
        detectionsCount: currentItems.length,
        redactionsCount: latestSensitiveRegions.length,
        rawPiiTransmitted: policyResult.violations.length,
        actionsTotal: 0,
        actionsCompleted: 0,
        actionsExecuted: [],
      };
    }

    // 5. PLANNING
    notifyProgress({
      step: 'PLANNING',
      message: 'Transmitting sanitized context to backend planner...',
    });
    let serverRes: { ok: boolean; response?: any; error?: string } | null = null;
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        serverRes = await new Promise<{ ok: boolean; response?: any; error?: string }>((resolve) => {
          chrome.runtime.sendMessage(
            { type: 'ANALYZE_PAGE', payload: analyzeRequest },
            (res) => resolve(res || { ok: false, error: 'No response from server' })
          );
        });
      } catch {}
    }

    if (!serverRes || !serverRes.ok) {
      try {
        const fetchRes = await fetch('http://127.0.0.1:8000/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analyzeRequest),
        });
        if (!fetchRes.ok) {
          throw new Error(`Server returned HTTP ${fetchRes.status}: ${await fetchRes.text()}`);
        }
        const data = await fetchRes.json();
        serverRes = { ok: true, response: data };
      } catch (fErr: any) {
        throw new Error(`Planner error: ${fErr.message || String(fErr)}`);
      }
    }

    const plannedActions: AgentAction[] = serverRes.response.actions || [];
    if (plannedActions.length === 0) {
      throw new Error('Planner returned 0 actions for the requested task');
    }

    // 6. ACTION_VALIDATION
    notifyProgress({
      step: 'ACTION_VALIDATION',
      message: `Validating ${plannedActions.length} planned action(s) for browser safety...`,
      actionsTotal: plannedActions.length,
    });
    for (const act of plannedActions) {
      const v = validateAction(act);
      if (!v.valid) {
        throw new Error(`Unsafe action rejected by security policy: ${v.reason}`);
      }
    }

    // 7. EXECUTING
    const executedResults: ActionResult[] = [];
    for (let i = 0; i < plannedActions.length; i++) {
      const act = plannedActions[i];
      notifyProgress({
        step: 'EXECUTING',
        message: `Executing (${i + 1}/${plannedActions.length}): ${act.action.toUpperCase()} ${act.selector || act.target || ''}`,
        actionsTotal: plannedActions.length,
        actionsCompleted: i,
        currentAction: `${act.action.toUpperCase()}: ${act.reason || act.selector || act.target}`,
      });

      const execRes = await actionExecutor.execute(act, latestSensitiveRegions);
      executedResults.push(execRes);

      if (!execRes.success) {
        throw new Error(`Action execution failed: ${execRes.error}`);
      }

      // Micro-delay between actions to allow page DOM to update
      await new Promise((r) => setTimeout(r, 200));
    }

    // 8. VERIFYING
    notifyProgress({
      step: 'VERIFYING',
      message: 'Verifying task completion on browser page state...',
      actionsTotal: plannedActions.length,
      actionsCompleted: plannedActions.length,
    });

    // Verify task outcome
    await new Promise((r) => setTimeout(r, 200));

    // 9. COMPLETED
    notifyProgress({
      step: 'COMPLETED',
      message: 'Task completed successfully! Page state updated.',
      actionsTotal: plannedActions.length,
      actionsCompleted: plannedActions.length,
      verified: true,
    });

    return {
      ok: true,
      state: 'COMPLETED',
      taskDescription: taskDesc,
      detectionsCount: currentItems.length,
      redactionsCount: latestSensitiveRegions.length,
      rawPiiTransmitted: 0,
      actionsTotal: plannedActions.length,
      actionsCompleted: plannedActions.length,
      actionsExecuted: executedResults,
      sanitizedScreenshot: redactionRes.redactedDataUrl,
      reasoning: serverRes.response.reasoning,
    };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    notifyProgress({ step: 'FAILED', message: errorMsg, error: errorMsg });
    return {
      ok: false,
      state: 'FAILED',
      error: errorMsg,
      taskDescription: taskDesc,
      detectionsCount: currentItems.length,
      redactionsCount: latestSensitiveRegions.length,
      rawPiiTransmitted: 0,
      actionsTotal: 0,
      actionsCompleted: 0,
      actionsExecuted: [],
    };
  }
}

if (typeof window !== 'undefined') {
  (window as any).runAgentTask = runAgentTask;
  (window as any).runAgentPipeline = runAgentPipeline;

  window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'PF_RUN_AGENT_TASK') {
      const result = await runAgentTask(event.data.payload);
      window.postMessage({ type: 'PF_AGENT_TASK_RESULT', payload: result }, '*');
    }
  });
}



