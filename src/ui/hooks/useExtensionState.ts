// useExtensionState.ts — React hook that syncs with the background service worker

import { useState, useEffect, useCallback, useRef } from 'react';
import { ExtensionState, ScanResult, ExtensionMessage, DEFAULT_SETTINGS, ScanStatus } from '../../core/types';

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
};

export function useExtensionState() {
  const [state, setState] = useState<ExtensionState>(defaultState);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to current state to avoid stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  // ─── Load initial state from background ──────────────────────────────────

  const loadState = useCallback(() => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'GET_STATE' } as ExtensionMessage, (res: any) => {
          if (chrome.runtime?.lastError) {
            setError('Cannot connect to extension background.');
            return;
          }
          if (res?.state) {
            setState(res.state as ExtensionState);
            setScanning(res.state.scanStatus === 'scanning');
          }
        });
      }
    } catch {
      setError('Extension context unavailable.');
    }
  }, []);

  useEffect(() => {
    // Load state on mount
    loadState();

    // Query active tab URL if available
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
          if (chrome.runtime?.lastError) return;
          if (tabs[0]) {
            setState((prev) => ({
              ...prev,
              currentUrl: tabs[0].url ?? prev.currentUrl,
              currentTabId: tabs[0].id ?? prev.currentTabId,
            }));
          }
        });
      }
    } catch {
      // Dev / non-extension context
    }

    // Listen for STATE_UPDATE broadcasts from background
    const onMessage = (message: any) => {
      if (message?.type === 'STATE_UPDATE' && message.payload) {
        const nextState = message.payload as ExtensionState;
        setState(nextState);
        setScanning(nextState.scanStatus === 'scanning');
        if (nextState.scanErrorMessage) {
          setError(nextState.scanErrorMessage);
        } else {
          setError(null);
        }
      }
    };

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener(onMessage);
      }
    } catch {
      // Mock context
    }

    return () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
          chrome.runtime.onMessage.removeListener(onMessage);
        }
      } catch {
        // Ignored
      }
    };
  }, [loadState]);

  // ─── Trigger a manual scan ───────────────────────────────────────────────

  const triggerScan = useCallback(() => {
    setScanning(true);
    setError(null);
    setState((prev) => ({ ...prev, scanStatus: 'scanning' }));

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'SCAN_PAGE' } as ExtensionMessage, (res: any) => {
          const lastErr = chrome.runtime?.lastError;
          if (lastErr) {
            const msg = lastErr.message ?? 'Background message failed';
            setError(`Scan failed: ${msg}`);
            setState((prev) => ({
              ...prev,
              scanStatus: 'failed',
              scanErrorReason: 'no_content_script',
              scanErrorMessage: msg,
              lastScan: null,
            }));
            setScanning(false);
            return;
          }

          if (res?.error) {
            setError(res.error);
            setScanning(false);
            return;
          }

          if (res?.result) {
            const result = res.result as ScanResult;
            setState((prev) => ({
              ...prev,
              lastScan: result,
              scanStatus: 'success',
              scanErrorReason: null,
              scanErrorMessage: null,
              stats: computeStats(result),
              currentUrl: result.url,
            }));
          }
          setScanning(false);
        });
      } else {
        // Dev / mock context
        setTimeout(() => {
          setScanning(false);
        }, 300);
      }
    } catch {
      setError('Extension context unavailable.');
      setScanning(false);
    }
  }, []);

  // ─── Toggle overlay visibility ────────────────────────────────────────────

  const toggleOverlays = useCallback(() => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(
          { type: 'TOGGLE_OVERLAYS' } as ExtensionMessage,
          (res: any) => {
            void chrome.runtime?.lastError;
            if (res && typeof res.overlaysVisible === 'boolean') {
              setState((prev) => ({ ...prev, overlaysVisible: res.overlaysVisible }));
            }
          }
        );
      }
    } catch {
      setState((prev) => ({ ...prev, overlaysVisible: !prev.overlaysVisible }));
    }
  }, []);

  // ─── Refresh state ────────────────────────────────────────────────────────

  const refresh = useCallback(() => {
    loadState();
  }, [loadState]);

  return { state, scanning, error, triggerScan, toggleOverlays, refresh };
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
