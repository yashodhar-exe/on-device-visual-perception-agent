/**
 * background.ts — Service Worker
 *
 * Manages extension state, badge, tab lifecycle, and cross-component
 * message routing. All state is stored in chrome.storage.local.
 */

import {
  ExtensionMessage,
  ExtensionState,
  ScanResult,
  ActivityEvent,
  ProtectionStats,
} from '../core/types';
import { generateId, formatTimestamp } from '../core/utils';

// ─── Initial state ────────────────────────────────────────────────────────────

const defaultState: ExtensionState = {
  enabled: true,
  currentUrl: '',
  currentTabId: null,
  lastScan: null,
  stats: { protected: 0, blocked: 0, warnings: 0 },
  activityLog: [],
  overlaysVisible: false,
};

let state: ExtensionState = { ...defaultState };

// ─── Persist + broadcast state ────────────────────────────────────────────────

async function saveState() {
  await chrome.storage.local.set({ pfState: state });
}

async function loadState() {
  const stored = await chrome.storage.local.get('pfState');
  if (stored.pfState) {
    state = { ...defaultState, ...stored.pfState };
  }
}

// ─── Badge update ─────────────────────────────────────────────────────────────

function updateBadge(tabId: number, count: number, riskScore: number) {
  const text = count > 0 ? String(count) : '';
  const color =
    riskScore >= 70 ? '#B91C1C' : riskScore >= 40 ? '#B45309' : '#15803D';

  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });
}

// ─── Add activity event ───────────────────────────────────────────────────────

function addActivity(event: Omit<ActivityEvent, 'id'>) {
  const entry: ActivityEvent = { id: generateId(), ...event };
  state.activityLog = [entry, ...state.activityLog].slice(0, 100);
}

// ─── Handle scan complete ─────────────────────────────────────────────────────

async function handleScanComplete(result: ScanResult, tabId: number) {
  result.tabId = tabId;
  state.lastScan = result;
  state.currentUrl = result.url;
  state.currentTabId = tabId;

  // Update stats
  const stats: ProtectionStats = { protected: 0, blocked: 0, warnings: 0 };
  for (const item of result.items) {
    if (item.status === 'redacted' || item.status === 'blocked') stats.protected++;
    if (item.status === 'blocked') stats.blocked++;
    if (item.confidence < 0.8) stats.warnings++;
  }
  state.stats = stats;

  // Log activity
  for (const item of result.items.slice(0, 5)) {
    addActivity({
      timestamp: Date.now(),
      type: item.type,
      action: `${item.type} detected`,
      url: result.url,
    });
  }

  updateBadge(tabId, result.items.length, result.riskScore);
  await saveState();
}

// ─── Message router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    switch (message.type) {
      case 'SCAN_COMPLETE': {
        const result = message.payload as ScanResult;
        if (tabId) handleScanComplete(result, tabId);
        sendResponse({ ok: true });
        break;
      }

      case 'GET_STATE': {
        sendResponse({ state });
        break;
      }

      case 'SCAN_PAGE': {
        // Relay to content script
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, (res) => {
            sendResponse(res);
          });
          return true;
        }
        break;
      }

      case 'BLOCK_REQUEST': {
        const { violations } = message.payload as { url: string; violations: string[] };
        state.stats.blocked++;
        if (tabId) {
          addActivity({
            timestamp: Date.now(),
            type: 'API_KEY',
            action: 'Network request blocked',
            url: state.currentUrl,
          });
          updateBadge(tabId, (state.lastScan?.items.length ?? 0), 80);
        }
        saveState();
        sendResponse({ ok: true });
        break;
      }

      case 'TOGGLE_OVERLAYS': {
        if (state.currentTabId) {
          chrome.tabs.sendMessage(
            state.currentTabId,
            { type: 'TOGGLE_OVERLAYS' },
            (res) => {
              if (res) state.overlaysVisible = res.overlaysVisible;
              saveState();
              sendResponse(res);
            }
          );
          return true;
        }
        break;
      }
    }
  }
);

// ─── Tab lifecycle ────────────────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  state.currentTabId = tabId;
  const tab = await chrome.tabs.get(tabId);
  state.currentUrl = tab.url ?? '';
  saveState();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    state.currentUrl = tab.url ?? '';
    state.currentTabId = tabId;
    saveState();
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

loadState();
