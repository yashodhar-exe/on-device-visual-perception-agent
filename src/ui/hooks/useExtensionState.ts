// useExtensionState.ts — React hook that syncs with chrome.storage

import { useState, useEffect, useCallback } from 'react';
import { ExtensionState, ScanResult } from '../../core/types';

const defaultState: ExtensionState = {
  enabled: true,
  currentUrl: '',
  currentTabId: null,
  lastScan: null,
  stats: { protected: 0, blocked: 0, warnings: 0 },
  activityLog: [],
  overlaysVisible: false,
};

export function useExtensionState() {
  const [state, setState] = useState<ExtensionState>(defaultState);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load state from background on mount
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res: any) => {
      if (chrome.runtime.lastError) {
        setError('Cannot connect to extension background.');
        return;
      }
      if (res?.state) setState(res.state);
    });

    // Get current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (tabs[0]) {
        setState((prev) => ({
          ...prev,
          currentUrl: tabs[0].url ?? '',
          currentTabId: tabs[0].id ?? null,
        }));
      }
    });

    // Listen for state updates from background
    const listener = (message: any) => {
      if (message.type === 'STATE_UPDATE' && message.payload) {
        setState(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Trigger a scan on the active tab
  const triggerScan = useCallback(() => {
    setScanning(true);
    setError(null);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      const tab = tabs[0];
      if (!tab?.id) {
        setError('No active tab found.');
        setScanning(false);
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PAGE' }, (res: any) => {
        if (chrome.runtime.lastError) {
          setError('Cannot scan this page (restricted URL).');
          setScanning(false);
          return;
        }
        if (res?.result) {
          setState((prev) => ({
            ...prev,
            lastScan: res.result,
            stats: computeStats(res.result),
          }));
        }
        setScanning(false);
      });
    });
  }, []);

  const toggleOverlays = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_OVERLAYS' });
    setState((prev) => ({ ...prev, overlaysVisible: !prev.overlaysVisible }));
  }, []);

  return { state, scanning, error, triggerScan, toggleOverlays };
}

function computeStats(scan: ScanResult) {
  let p = 0, b = 0, w = 0;
  for (const item of scan.items) {
    if (item.status === 'redacted' || item.status === 'blocked') p++;
    if (item.status === 'blocked') b++;
    if (item.confidence < 0.8) w++;
  }
  return { protected: p, blocked: b, warnings: w };
}
