/**
 * background.js — Privacy Firewall Service Worker
 * Placed in /public so CRA copies it to /build on every `npm run build`.
 * Self-contained — no bundler or ES module imports required.
 */

let state = {
  enabled: true,
  currentUrl: '',
  currentTabId: null,
  lastScan: null,
  stats: { protected: 0, blocked: 0, warnings: 0 },
  activityLog: [],
  overlaysVisible: false,
};

async function saveState() {
  try { await chrome.storage.local.set({ pfState: state }); } catch(e) {}
}

async function loadState() {
  try {
    const stored = await chrome.storage.local.get('pfState');
    if (stored && stored.pfState) state = { ...state, ...stored.pfState };
  } catch(e) {}
}

function updateBadge(tabId, count, riskScore) {
  if (!tabId) return;
  const text = count > 0 ? String(count) : '';
  const color = riskScore >= 70 ? '#B91C1C' : riskScore >= 40 ? '#B45309' : '#15803D';
  try {
    chrome.action.setBadgeText({ text, tabId });
    chrome.action.setBadgeBackgroundColor({ color, tabId });
  } catch(e) {}
}

function addActivity(type, action, url) {
  const entry = {
    id: 'pf-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    type: type || 'OTHER',
    action: action || '',
    url: url || '',
  };
  state.activityLog = [entry, ...state.activityLog].slice(0, 100);
}

async function handleScanComplete(result, tabId) {
  if (!result) return;
  result.tabId = tabId;
  state.lastScan = result;
  state.currentUrl = result.url || '';
  state.currentTabId = tabId;

  const items = result.items || [];
  let p = 0, b = 0, w = 0;
  items.forEach(item => {
    if (item.status === 'redacted' || item.status === 'blocked') p++;
    if (item.status === 'blocked') b++;
    if (item.confidence < 0.8) w++;
  });
  state.stats = { protected: p, blocked: b, warnings: w };

  // Log activity for recent items
  items.slice(0, 6).forEach(item => {
    addActivity(item.type, item.type.replace(/_/g, ' ') + ' detected', result.url);
  });

  updateBadge(tabId, items.length, result.riskScore || 0);
  await saveState();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender && sender.tab && sender.tab.id;

  switch (message.type) {
    case 'SCAN_COMPLETE': {
      handleScanComplete(message.payload, tabId).then(() => sendResponse({ ok: true }));
      return true;
    }
    case 'GET_STATE': {
      sendResponse({ state: state });
      break;
    }
    case 'SCAN_PAGE': {
      const tid = state.currentTabId;
      if (tid) {
        chrome.tabs.sendMessage(tid, { type: 'SCAN_PAGE' }, function(res) {
          sendResponse(res);
        });
        return true;
      }
      sendResponse({ error: 'No active tab tracked' });
      break;
    }
    case 'TOGGLE_OVERLAYS': {
      const tid = state.currentTabId;
      if (tid) {
        chrome.tabs.sendMessage(tid, { type: 'TOGGLE_OVERLAYS' }, function(res) {
          if (res) state.overlaysVisible = res.overlaysVisible;
          saveState();
          sendResponse(res || { overlaysVisible: false });
        });
        return true;
      }
      break;
    }
    case 'BLOCK_REQUEST': {
      state.stats.blocked = (state.stats.blocked || 0) + 1;
      addActivity('API_KEY', 'Network request blocked', state.currentUrl);
      if (state.currentTabId) {
        const len = state.lastScan && state.lastScan.items ? state.lastScan.items.length : 0;
        updateBadge(state.currentTabId, len, 80);
      }
      saveState();
      sendResponse({ ok: true });
      break;
    }
    case 'REDACT_ITEM': {
      const tid = state.currentTabId;
      if (tid) {
        chrome.tabs.sendMessage(tid, message, function(res) { sendResponse(res); });
        return true;
      }
      break;
    }
  }
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
  state.currentTabId = activeInfo.tabId;
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    if (tab) state.currentUrl = tab.url || '';
    saveState();
  });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.active) {
    state.currentUrl = tab.url || '';
    state.currentTabId = tabId;
    saveState();
  }
});

loadState();
