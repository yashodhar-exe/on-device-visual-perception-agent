/**
 * background.ts — Service Worker
 *
 * Production-hardened service worker for Privacy Firewall Chrome Extension.
 *
 * Responsibilities:
 *  1. State Management & Storage Cleanup (pfScan, pfScan_<tabId>)
 *  2. Tab Lifecycle tracking (resets stale scans on navigation, tab switches, close)
 *  3. Robust cross-component message routing with lastError and injection fallbacks
 *  4. Restricted URL detection (chrome://, webstore, about:)
 */

import {
  ExtensionMessage,
  ExtensionState,
  ScanResult,
  ActivityEvent,
  ProtectionStats,
  ExtensionSettings,
  DEFAULT_SETTINGS,
  ScanStatus,
  ScanErrorReason,
  AgentAction,
  ActionResult,
  AnalyzeRequest,
  AnalyzeResponse,
  PrivacyAuditRecord,
} from '../core/types';
import { generateId, buildScanReport } from '../core/utils';

// ─── Restricted URL Helper ──────────────────────────────────────────────────

export function isRestrictedUrl(url?: string): boolean {
  if (!url) return true;
  const u = url.trim().toLowerCase();
  return (
    u.startsWith('chrome://') ||
    u.startsWith('chrome-extension://') ||
    u.startsWith('edge://') ||
    u.startsWith('about:') ||
    u.startsWith('view-source:') ||
    u.includes('chromewebstore.google.com') ||
    u.includes('chrome.google.com/webstore')
  );
}

// ─── Initial State ────────────────────────────────────────────────────────────

const defaultState: ExtensionState = {
  enabled: true,
  currentUrl: '',
  currentTabId: null,
  scanStatus: 'idle',
  scanErrorReason: null,
  scanErrorMessage: null,
  lastScan: null,
  stats: { protected: 0, blocked: 0, warnings: 0 },
  activityLog: [],
  overlaysVisible: false,
  settings: { ...DEFAULT_SETTINGS },
  lastMetrics: null,
  agentRunning: false,
  latestSanitizedScreenshot: null,
  latestA11yTree: null,
  latestSensitiveRegions: null,
  pendingActions: [],
  actionHistory: [],
  auditLog: [],
  agentError: null,
};

let state: ExtensionState = { ...defaultState };

// ─── Storage Helpers & Cleanup ────────────────────────────────────────────────

export async function clearScan(tabId?: number | null): Promise<void> {
  state.lastScan = null;
  state.lastMetrics = null;
  state.scanStatus = 'idle';
  state.scanErrorReason = null;
  state.scanErrorMessage = null;
  state.stats = { protected: 0, blocked: 0, warnings: 0 };

  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    try {
      await chrome.storage.session.remove('pfScan');
      if (tabId) {
        await chrome.storage.session.remove(`pfScan_${tabId}`);
      }
    } catch {
      // Non-fatal
    }
  }

  if (typeof chrome !== 'undefined' && tabId && chrome.action?.setBadgeText) {
    try {
      chrome.action.setBadgeText({ text: '', tabId });
    } catch {
      // Ignored
    }
  }
}

async function saveState(): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      if (state.lastScan) {
        await chrome.storage.session.set({ pfScan: state.lastScan });
        if (state.currentTabId) {
          await chrome.storage.session.set({
            [`pfScan_${state.currentTabId}`]: state.lastScan,
          });
        }
      } else {
        await chrome.storage.session.remove('pfScan');
        if (state.currentTabId) {
          await chrome.storage.session.remove(`pfScan_${state.currentTabId}`);
        }
      }
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({
        pfSettings: {
          enabled: state.enabled,
          overlaysVisible: state.overlaysVisible,
          activityLog: state.activityLog.slice(0, 50),
          settings: state.settings,
        },
      });
    }
  } catch {
    // Non-fatal
  }
}

async function loadState(): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const local = await chrome.storage.local.get('pfSettings');
      if (local.pfSettings) {
        state = {
          ...defaultState,
          enabled: local.pfSettings.enabled ?? true,
          overlaysVisible: local.pfSettings.overlaysVisible ?? false,
          activityLog: local.pfSettings.activityLog ?? [],
          settings: { ...DEFAULT_SETTINGS, ...(local.pfSettings.settings ?? {}) },
        };
      }
    }
  } catch {
    // Non-fatal — use default state
  }
}

// ─── State Broadcast ──────────────────────────────────────────────────────────

function broadcastState(): void {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime
        .sendMessage({
          type: 'STATE_UPDATE',
          payload: state,
        } as ExtensionMessage)
        .catch(() => {
          // Popup may not be open
        });
    }
  } catch {
    // Runtime disconnected
  }
}

// ─── Badge Update ─────────────────────────────────────────────────────────────

function updateBadge(tabId: number, count: number, riskScore: number): void {
  if (typeof chrome === 'undefined' || !tabId || !chrome.action) return;
  const text = count > 0 ? String(count) : '';
  const color =
    riskScore >= 70 ? '#B91C1C' : riskScore >= 40 ? '#B45309' : '#15803D';

  try {
    chrome.action.setBadgeText({ text, tabId });
    chrome.action.setBadgeBackgroundColor({ color, tabId });
  } catch {
    // Tab closed
  }
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

function addActivity(event: Omit<ActivityEvent, 'id'>): void {
  const entry: ActivityEvent = { id: generateId(), ...event };
  state.activityLog = [entry, ...state.activityLog].slice(0, 100);
}

// ─── Handle Scan Complete ─────────────────────────────────────────────────────

async function handleScanComplete(result: ScanResult, tabId: number): Promise<void> {
  // Validate that result tab matches active tab
  if (state.currentTabId && tabId !== state.currentTabId) {
    return; // Discard scan for non-active tab
  }

  result.tabId = tabId;
  state.lastScan = result;
  state.currentUrl = result.url;
  state.currentTabId = tabId;
  state.scanStatus = 'success';
  state.scanErrorReason = null;
  state.scanErrorMessage = null;
  state.lastMetrics = result.metrics ?? null;

  const stats: ProtectionStats = { protected: 0, blocked: 0, warnings: 0 };
  for (const item of result.items) {
    if (item.status === 'redacted' || item.status === 'blocked') stats.protected++;
    if (item.status === 'blocked') stats.blocked++;
    if (item.confidence < 0.8) stats.warnings++;
  }
  state.stats = stats;

  for (const item of result.items.slice(0, 5)) {
    addActivity({
      timestamp: Date.now(),
      type: item.type,
      action: `${item.type.replace(/_/g, ' ')} detected`,
      url: result.url,
    });
  }

  updateBadge(tabId, result.items.length, result.riskScore);
  await saveState();
  broadcastState();
}

// ─── Dynamic Script Injection Fallback ────────────────────────────────────────

function tryInjectContentScript(tabId: number, callback: () => void) {
  if (typeof chrome === 'undefined' || !chrome.scripting) {
    callback();
    return;
  }

  try {
    chrome.scripting
      .executeScript({
        target: { tabId },
        files: ['content.js'],
      })
      .then(() => callback())
      .catch(() => callback());
  } catch {
    callback();
  }
}

// ─── Trigger Scan Command ─────────────────────────────────────────────────────

function triggerScanForTab(tabId: number, tabUrl?: string, sendResponse?: (res: any) => void) {
  if (isRestrictedUrl(tabUrl)) {
    clearScan(tabId);
    state.scanStatus = 'restricted';
    state.scanErrorReason = 'restricted_url';
    state.scanErrorMessage = 'Cannot scan this page (restricted URL or browser page).';
    saveState();
    broadcastState();
    sendResponse?.({ ok: false, error: 'Restricted URL' });
    return;
  }

  state.scanStatus = 'scanning';
  state.scanErrorReason = null;
  state.scanErrorMessage = null;
  broadcastState();

  let responded = false;
  const timeout = setTimeout(() => {
    if (responded) return;
    responded = true;

    // Attempt script injection as fallback
    tryInjectContentScript(tabId, () => {
      chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, (res) => {
        const err = chrome.runtime.lastError;
        if (err || !res) {
          state.scanStatus = 'failed';
          state.scanErrorReason = 'no_content_script';
          state.scanErrorMessage = 'Content script unavailable on this page.';
          clearScan(tabId);
          state.scanStatus = 'failed';
          saveState();
          broadcastState();
          sendResponse?.({ ok: false, error: 'Content script unavailable' });
        } else {
          sendResponse?.(res);
        }
      });
    });
  }, 1200);

  chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, (res) => {
    if (responded) return;
    responded = true;
    clearTimeout(timeout);

    const err = chrome.runtime.lastError;
    if (err || !res) {
      tryInjectContentScript(tabId, () => {
        chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, (res2) => {
          const err2 = chrome.runtime.lastError;
          if (err2 || !res2) {
            state.scanStatus = 'failed';
            state.scanErrorReason = 'no_content_script';
            state.scanErrorMessage = 'Content script unavailable on this page.';
            clearScan(tabId);
            state.scanStatus = 'failed';
            saveState();
            broadcastState();
            sendResponse?.({ ok: false, error: 'Content script unavailable' });
          } else {
            sendResponse?.(res2);
          }
        });
      });
    } else {
      sendResponse?.(res);
    }
  });
}

// ─── Message Listener ─────────────────────────────────────────────────────────

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    switch (message.type) {
      case 'SCAN_COMPLETE': {
        const result = message.payload as ScanResult;
        if (tabId) {
          handleScanComplete(result, tabId).then(() => sendResponse({ ok: true }));
          return true;
        }
        sendResponse({ ok: false, error: 'No tab ID' });
        break;
      }

      case 'GET_STATE': {
        sendResponse({ state });
        break;
      }

      case 'SCAN_PAGE': {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0];
          if (!activeTab || !activeTab.id) {
            state.scanStatus = 'failed';
            state.scanErrorReason = 'no_content_script';
            state.scanErrorMessage = 'No active tab found';
            broadcastState();
            sendResponse({ ok: false, error: 'No active tab' });
            return;
          }
          triggerScanForTab(activeTab.id, activeTab.url, sendResponse);
        });
        return true;
      }

      case 'TOGGLE_OVERLAYS': {
        const tid = state.currentTabId;
        if (tid) {
          chrome.tabs.sendMessage(tid, { type: 'TOGGLE_OVERLAYS' }, (res) => {
            void chrome.runtime.lastError;
            if (res) {
              state.overlaysVisible = res.overlaysVisible;
              saveState();
              broadcastState();
            }
            sendResponse(res ?? { overlaysVisible: false });
          });
          return true;
        }
        sendResponse({ overlaysVisible: false });
        break;
      }

      case 'BLOCK_REQUEST': {
        state.stats.blocked = (state.stats.blocked ?? 0) + 1;
        if (tabId) {
          addActivity({
            timestamp: Date.now(),
            type: 'API_KEY',
            action: 'Network request sanitized',
            url: state.currentUrl,
          });
          updateBadge(tabId, state.lastScan?.items.length ?? 0, 80);
        }
        saveState();
        broadcastState();
        sendResponse({ ok: true });
        break;
      }

      case 'REDACT_ITEM': {
        const tid = state.currentTabId ?? tabId;
        if (tid) {
          chrome.tabs.sendMessage(tid, message, (res) => {
            void chrome.runtime.lastError;
            sendResponse(res ?? { ok: false });
          });
          return true;
        }
        sendResponse({ ok: false });
        break;
      }

      case 'GET_SETTINGS': {
        sendResponse({ settings: state.settings });
        break;
      }

      case 'SAVE_SETTINGS': {
        const incoming = message.payload as Partial<ExtensionSettings>;
        state.settings = { ...state.settings, ...incoming };
        saveState().then(() => {
          broadcastState();
          sendResponse({ ok: true });
        });
        return true;
      }

      case 'GET_REPORT': {
        if (state.lastScan) {
          sendResponse({ report: buildScanReport(state.lastScan) });
        } else {
          sendResponse({ report: null });
        }
        break;
      }

      case 'CLEAR_OVERLAYS': {
        const tid = state.currentTabId ?? tabId;
        if (tid) {
          chrome.tabs.sendMessage(tid, message, (res) => {
            void chrome.runtime.lastError;
            sendResponse(res ?? { ok: false });
          });
          return true;
        }
        sendResponse({ ok: false });
        break;
      }

      case 'CAPTURE_SCREENSHOT': {
        if (typeof chrome !== 'undefined' && chrome.tabs?.captureVisibleTab) {
          chrome.tabs.captureVisibleTab(null as any, { format: 'png' }, (dataUrl) => {
            const err = chrome.runtime.lastError;
            if (err || !dataUrl) {
              sendResponse({ ok: false, error: err?.message || 'Failed to capture tab' });
            } else {
              sendResponse({ ok: true, dataUrl });
            }
          });
          return true;
        }
        sendResponse({ ok: false, error: 'captureVisibleTab not available' });
        break;
      }

      case 'ANALYZE_PAGE': {
        state.agentRunning = true;
        state.agentError = null;
        broadcastState();

        const req = message.payload as AnalyzeRequest;
        const endpoint = `${state.settings.serverEndpoint || 'http://localhost:8000'}/analyze`;

        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        })
          .then(async (res) => {
            if (!res.ok) {
              const errBody = await res.text();
              throw new Error(`Server returned ${res.status}: ${errBody}`);
            }
            return res.json() as Promise<AnalyzeResponse>;
          })
          .then((analyzeRes) => {
            state.agentRunning = false;
            state.pendingActions = analyzeRes.actions || [];
            state.latestSanitizedScreenshot = req.screenshot;
            state.latestA11yTree = req.accessibilityTree;

            const auditRecord: PrivacyAuditRecord = {
              id: generateId(),
              timestamp: Date.now(),
              url: state.currentUrl,
              detectionsCount: state.lastScan?.items.length || 0,
              redactionsCount: state.lastScan?.items.length || 0,
              rawPiiTransmitted: 0,
              payloadSafe: true,
              serverCalled: true,
              actionsReceived: analyzeRes.actions?.length || 0,
              actionsExecuted: 0,
            };
            state.auditLog = [auditRecord, ...(state.auditLog || [])].slice(0, 50);

            saveState();
            broadcastState();
            sendResponse({ ok: true, response: analyzeRes });
          })
          .catch((err) => {
            state.agentRunning = false;
            state.agentError = err.message || String(err);
            saveState();
            broadcastState();
            sendResponse({ ok: false, error: err.message || String(err) });
          });

        return true;
      }

      case 'EXECUTE_ACTION': {
        const action = message.payload as AgentAction;
        const tid = state.currentTabId;
        if (tid) {
          chrome.tabs.sendMessage(tid, { type: 'EXECUTE_ACTION', payload: action }, (res) => {
            void chrome.runtime.lastError;
            if (res && res.result) {
              state.actionHistory = [res.result, ...(state.actionHistory || [])].slice(0, 50);
              if (state.auditLog && state.auditLog.length > 0 && res.result.success) {
                state.auditLog[0].actionsExecuted = (state.auditLog[0].actionsExecuted || 0) + 1;
              }
              saveState();
              broadcastState();
            }
            sendResponse(res ?? { ok: false });
          });
          return true;
        }
        sendResponse({ ok: false, error: 'No active tab' });
        break;
      }

      case 'GET_AUDIT_LOG': {
        sendResponse({ auditLog: state.auditLog || [] });
        break;
      }

      case 'CLEAR_AUDIT_LOG': {
        state.auditLog = [];
        state.actionHistory = [];
        state.pendingActions = [];
        saveState();
        broadcastState();
        sendResponse({ ok: true });
        break;
      }
    }
  });
}

// ─── Tab Lifecycle Listeners ─────────────────────────────────────────────────

if (typeof chrome !== 'undefined' && chrome.tabs?.onActivated) {
  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    state.currentTabId = tabId;
    try {
      const tab = await chrome.tabs.get(tabId);
      state.currentUrl = tab.url ?? '';

      if (isRestrictedUrl(state.currentUrl)) {
        await clearScan(tabId);
        state.scanStatus = 'restricted';
        state.scanErrorReason = 'restricted_url';
        state.scanErrorMessage = 'Cannot scan this page (restricted URL or browser page).';
      } else {
        // Load cached session scan for this specific tab & URL
        let loaded = false;
        if (chrome.storage?.session) {
          const stored = await chrome.storage.session.get(`pfScan_${tabId}`);
          const scan = stored[`pfScan_${tabId}`] as ScanResult | undefined;
          if (scan && scan.url === state.currentUrl) {
            state.lastScan = scan;
            state.scanStatus = 'success';
            state.scanErrorReason = null;
            state.scanErrorMessage = null;
            state.lastMetrics = scan.metrics ?? null;
            loaded = true;
          }
        }
        if (!loaded) {
          await clearScan(tabId);
          state.scanStatus = 'idle';
        }
      }

      const items = state.lastScan?.items ?? [];
      updateBadge(tabId, items.length, state.lastScan?.riskScore ?? 0);
    } catch {
      await clearScan(tabId);
      state.scanStatus = 'idle';
    }
    broadcastState();
    saveState();
  });
}

if (typeof chrome !== 'undefined' && chrome.tabs?.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active && (changeInfo.status === 'loading' || changeInfo.url)) {
      state.currentUrl = tab.url ?? '';
      state.currentTabId = tabId;

      if (isRestrictedUrl(state.currentUrl)) {
        clearScan(tabId);
        state.scanStatus = 'restricted';
        state.scanErrorReason = 'restricted_url';
        state.scanErrorMessage = 'Cannot scan this page (restricted URL or browser page).';
      } else if (changeInfo.status === 'loading') {
        // Clear scan on page reload or navigation
        clearScan(tabId);
        state.scanStatus = 'idle';
      }

      saveState();
      broadcastState();
    }
  });
}

if (typeof chrome !== 'undefined' && chrome.tabs?.onRemoved) {
  chrome.tabs.onRemoved.addListener(async (tabId) => {
    await clearScan(tabId);
    if (state.currentTabId === tabId) {
      state.currentTabId = null;
      broadcastState();
    }
  });
}

// ─── Initialize ──────────────────────────────────────────────────────────────

loadState();
