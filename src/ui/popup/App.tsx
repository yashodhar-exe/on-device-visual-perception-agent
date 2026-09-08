// App.tsx — Root popup component with error boundary & scan status management
// Tabs: overview | items | analytics | diagnostics | threats | settings | developer

import React, { Component, useState } from 'react';
import '../../index.css';
import { useExtensionState } from '../hooks/useExtensionState';
import { Header } from '../components/Header';
import { RiskScore } from '../components/RiskScore';
import { ItemsTable } from '../components/ItemsTable';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { DetailsModal } from '../components/DetailsModal';
import { SanitizedPayloadView } from '../components/SanitizedPayloadView';
import { OverlayToggle, ColorLegend } from '../components/OverlayToggle';
import { ScanReportExport } from '../components/ScanReportExport';
import { AnalyticsChart } from '../components/AnalyticsChart';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { SettingsPanel } from '../components/SettingsPanel';
import { DeveloperPanel } from '../components/DeveloperPanel';
import { ThreatExplanationList } from '../components/ThreatExplanationCard';
import { AgentPanel } from '../components/AgentPanel';
import { DetectedItem, ScanStatus } from '../../core/types';

type Tab = 'overview' | 'agent' | 'items' | 'analytics' | 'diagnostics' | 'threats' | 'settings' | 'dev';

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  agent: 'Vision Agent',
  items: 'Items',
  analytics: 'Analytics',
  diagnostics: 'Diagnostics',
  threats: 'Threats',
  settings: 'Settings',
  dev: 'Dev',
};

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryState { hasError: boolean; error: string }

class ErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#B91C1C' }}>
          <strong>Render Error:</strong>
          <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const AppInner: React.FC = () => {
  const { state, scanning, error, triggerScan, toggleOverlays, refresh } = useExtensionState();
  const [selectedItem, setSelectedItem] = useState<DetectedItem | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Refresh state from background on popup open
  React.useEffect(() => { refresh(); }, [refresh]);

  // Validate scan against current tab and URL to prevent showing stale scans from other sites
  const rawScan = state?.lastScan;
  const isScanValid =
    rawScan &&
    state.scanStatus === 'success' &&
    ((state.currentTabId && rawScan.tabId === state.currentTabId) ||
     (state.currentUrl && rawScan.url === state.currentUrl));

  const currentScan = isScanValid ? rawScan : null;
  const status: ScanStatus = state?.scanStatus ?? (currentScan ? 'success' : 'idle');

  const items = currentScan?.items ?? [];
  const riskScore = currentScan?.riskScore ?? 0;
  const payload = (currentScan?.sanitizedPayload ?? {}) as Record<string, string>;
  const isProtected = items.length > 0 && items.some((i) => i.status !== 'detected');
  const devMode = state?.settings?.developerMode ?? false;

  const handleRedact = (item: DetectedItem) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
          const tab = tabs[0];
          if (tab?.id)
            chrome.tabs.sendMessage(tab.id, { type: 'REDACT_ITEM', payload: { id: item.id } });
        });
      }
    } catch { /* no-op in dev */ }
    setSelectedItem(null);
  };

  const handleBlock = (item: DetectedItem) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'BLOCK_REQUEST', payload: { id: item.id } });
      }
    } catch { /* no-op in dev */ }
    setSelectedItem(null);
  };

  // Visible tabs list
  const visibleTabs: Tab[] = ['overview', 'agent', 'items', 'analytics', 'diagnostics', 'threats', 'settings'];
  if (devMode) visibleTabs.push('dev');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* Top nav */}
      <Header
        currentUrl={state?.currentUrl ?? ''}
        isProtected={isProtected}
        scanning={scanning || status === 'scanning'}
        onScan={triggerScan}
      />

      {/* Tab bar — scrollable */}
      <div
        role="tablist"
        aria-label="Dashboard tabs"
        style={{
          display: 'flex',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            id={`tab-${tab}`}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`panel-${tab}`}
            onClick={() => setActiveTab(tab)}
            style={{
              flexShrink: 0,
              padding: '7px 12px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              fontSize: '11px',
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              position: 'relative',
            }}
          >
            {TAB_LABELS[tab]}
            {tab === 'items' && items.length > 0 && (
              <span
                style={{
                  marginLeft: '4px',
                  background: items.length > 5 ? '#B91C1C' : 'var(--accent)',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 4px',
                  borderRadius: '8px',
                  verticalAlign: 'super',
                }}
              >
                {items.length}
              </span>
            )}
            {tab === 'threats' && items.length > 0 && (
              <span
                style={{
                  marginLeft: '4px',
                  background: '#B45309',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 4px',
                  borderRadius: '8px',
                  verticalAlign: 'super',
                }}
              >
                !
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Global Error banner if present */}
      {error && status === 'idle' && (
        <div
          role="alert"
          style={{
            padding: '8px 16px',
            background: '#FEE2E2',
            borderBottom: '1px solid #FECACA',
            fontSize: '12px',
            color: '#991B1B',
          }}
        >
          {error}
        </div>
      )}

      {/* Main content */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        {/* ── Status Banner for Non-Success States ── */}
        {status === 'scanning' && (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>
              Scanning page...
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Analyzing DOM, input fields, tokens, and page content
            </div>
          </div>
        )}

        {status === 'restricted' && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#B45309', marginBottom: 8 }}>
              Cannot scan this page.
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Reason: Content script unavailable or restricted URL (e.g. browser internal pages or Web Store).
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#B91C1C', marginBottom: 8 }}>
              Scan failed.
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {state?.scanErrorMessage || 'Unable to analyze this page.'}
            </div>
          </div>
        )}

        {status === 'idle' && !currentScan && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Click <strong>Scan</strong> to analyze the current page for sensitive data.
            </p>
          </div>
        )}

        {/* ── Tabs Content (rendered ONLY if status is success or valid scan exists, or settings tab) ── */}

        {/* Overview Tab */}
        {activeTab === 'overview' && status === 'success' && currentScan && (
          <>
            <RiskScore score={riskScore} stats={state?.stats ?? { protected: 0, blocked: 0, warnings: 0 }} itemCount={items.length} />
            <OverlayToggle overlaysVisible={state?.overlaysVisible ?? false} onToggle={toggleOverlays} />
            <ColorLegend />
            <ActivityTimeline events={state?.activityLog ?? []} />
            <ScanReportExport scan={currentScan} />
          </>
        )}

        {/* Vision Agent Tab */}
        {activeTab === 'agent' && (
          <AgentPanel state={state} onRefreshState={refresh} />
        )}

        {/* Items Tab */}
        {activeTab === 'items' && (
          status === 'success' && currentScan ? (
            <ItemsTable items={items} onViewItem={setSelectedItem} />
          ) : (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
              No scan available.
            </div>
          )
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          status === 'success' && currentScan ? (
            <>
              <AnalyticsChart items={items} />
              <SanitizedPayloadView payload={payload} />
            </>
          ) : (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
              No scan available.
            </div>
          )
        )}

        {/* Diagnostics Tab */}
        {activeTab === 'diagnostics' && (
          status === 'success' && currentScan ? (
            <DiagnosticsPanel
              metrics={state?.lastMetrics ?? currentScan?.metrics ?? null}
              lastScanTime={currentScan?.timestamp ?? null}
            />
          ) : (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
              No scan available.
            </div>
          )
        )}

        {/* Threats Tab */}
        {activeTab === 'threats' && (
          status === 'success' && currentScan ? (
            <ThreatExplanationList items={items} />
          ) : (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
              No scan available.
            </div>
          )
        )}

        {/* Settings Tab — always available */}
        {activeTab === 'settings' && (
          <SettingsPanel />
        )}

        {/* Dev Tab — only if devMode */}
        {activeTab === 'dev' && devMode && (
          status === 'success' && currentScan ? (
            <DeveloperPanel items={items} />
          ) : (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
              No scan available.
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '5px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
          Privacy Firewall v1.0
        </span>
        <span
          style={{
            fontSize: '10px',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}
        >
          <span aria-hidden="true">●</span>
          <span>No data leaves your browser</span>
        </span>
      </div>

      {/* Detail modal */}
      {selectedItem && (
        <DetailsModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onRedact={handleRedact}
          onBlock={handleBlock}
        />
      )}
    </div>
  );
};

// ─── Export wrapped in error boundary ────────────────────────────────────────

export const App: React.FC = () => (
  <ErrorBoundary>
    <AppInner />
  </ErrorBoundary>
);
