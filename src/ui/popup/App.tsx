// App.tsx — Root popup component with error boundary

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
import { DetectedItem } from '../../core/types';

type Tab = 'overview' | 'items' | 'payload';

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
  const { state, scanning, error, triggerScan, toggleOverlays } = useExtensionState();
  const [selectedItem, setSelectedItem] = useState<DetectedItem | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const scan = state?.lastScan;
  const items = scan?.items ?? [];
  const riskScore = scan?.riskScore ?? 0;
  const payload = (scan?.sanitizedPayload ?? {}) as Record<string, string>;
  const isProtected = items.length > 0 && items.some((i) => i.status !== 'detected');

  const handleRedact = (item: DetectedItem) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
        const tab = tabs[0];
        if (tab?.id)
          chrome.tabs.sendMessage(tab.id, { type: 'REDACT_ITEM', payload: { id: item.id } });
      });
    } catch { /* no-op in dev */ }
    setSelectedItem(null);
  };

  const handleBlock = (item: DetectedItem) => {
    try {
      chrome.runtime.sendMessage({ type: 'BLOCK_REQUEST', payload: { id: item.id } });
    } catch { /* no-op in dev */ }
    setSelectedItem(null);
  };

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
        scanning={scanning}
        onScan={triggerScan}
      />

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {(['overview', 'items', 'payload'] as Tab[]).map((tab) => (
          <button
            key={tab}
            id={`tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '8px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              fontSize: '12px',
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              textTransform: 'capitalize',
              letterSpacing: '0.01em',
            }}
          >
            {tab}
            {tab === 'items' && items.length > 0 && (
              <span
                style={{
                  marginLeft: '5px',
                  background: items.length > 5 ? '#B91C1C' : 'var(--accent)',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '8px',
                }}
              >
                {items.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div
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
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {activeTab === 'overview' && (
          <>
            <RiskScore score={riskScore} stats={state?.stats ?? { protected: 0, blocked: 0, warnings: 0 }} itemCount={items.length} />
            <OverlayToggle overlaysVisible={state?.overlaysVisible ?? false} onToggle={toggleOverlays} />
            <ColorLegend />
            <ActivityTimeline events={state?.activityLog ?? []} />

            {!scan && !scanning && (
              <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Click <strong>Scan</strong> to analyze the current page for sensitive data.
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'items' && (
          <ItemsTable items={items} onViewItem={setSelectedItem} />
        )}

        {activeTab === 'payload' && (
          <SanitizedPayloadView payload={payload} />
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '6px 16px',
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
          <span>●</span>
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
