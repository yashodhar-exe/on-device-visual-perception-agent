// DiagnosticsPanel.tsx — P3: Performance Metrics / Diagnostics tab

import React from 'react';
import { ScanMetrics } from '../../core/types';
import { formatMs } from '../../core/utils';

interface DiagnosticsPanelProps {
  metrics: ScanMetrics | null;
  lastScanTime: number | null;
}

interface MetricRow {
  label: string;
  key: keyof ScanMetrics;
  description: string;
}

const METRIC_ROWS: MetricRow[] = [
  { label: 'DOM Scan', key: 'domScanMs', description: 'Input fields, text nodes, contenteditable elements' },
  { label: 'Regex', key: 'regexMs', description: 'Pattern matching across all text nodes (inline with DOM scan)' },
  { label: 'NER', key: 'nerMs', description: 'Named entity recognition — names, addresses' },
  { label: 'OCR', key: 'ocrMs', description: 'Optical character recognition on canvas/image elements' },
  { label: 'Face Detection', key: 'faceMs', description: 'Computer vision face detection on img elements' },
  { label: 'Overlay Render', key: 'overlayRenderMs', description: 'Drawing colored overlays on detected elements' },
  { label: 'Total', key: 'totalMs', description: 'End-to-end scan duration including all phases' },
];

function getBarColor(ms: number): string {
  if (ms < 20) return 'var(--success)';
  if (ms < 100) return 'var(--warning)';
  return 'var(--danger)';
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ metrics, lastScanTime }) => {
  if (!metrics) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
        <div style={{ marginBottom: '8px', fontSize: '20px' }}>⏱</div>
        No scan data. Run a scan to see performance metrics.
      </div>
    );
  }

  const maxMs = Math.max(...METRIC_ROWS.map((r) => metrics[r.key] ?? 0), 1);

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px 6px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Performance Metrics
        </span>
        {lastScanTime && (
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--mono)' }}>
            {new Date(lastScanTime).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Metric rows */}
      <div style={{ padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {METRIC_ROWS.map(({ label, key, description }) => {
          const ms = metrics[key] ?? 0;
          const barColor = key === 'totalMs' ? 'var(--accent)' : getBarColor(ms);
          const pct = Math.max((ms / maxMs) * 100, ms > 0 ? 4 : 0);

          return (
            <div key={key} title={description}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                <span
                  style={{
                    fontSize: key === 'totalMs' ? '12px' : '11px',
                    fontWeight: key === 'totalMs' ? 700 : 500,
                    color: key === 'totalMs' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: key === 'totalMs' ? 'var(--accent)' : getBarColor(ms),
                  }}
                >
                  {formatMs(ms)}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: key === 'totalMs' ? '8px' : '4px',
                  background: 'var(--border)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
                role="progressbar"
                aria-valuenow={ms}
                aria-label={`${label}: ${formatMs(ms)}`}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: barColor,
                    borderRadius: '4px',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance legend */}
      <div
        style={{
          margin: '0 16px 12px',
          padding: '8px 10px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          gap: '16px',
        }}
      >
        {[
          { color: 'var(--success)', label: '< 20ms (fast)' },
          { color: 'var(--warning)', label: '< 100ms (ok)' },
          { color: 'var(--danger)', label: '> 100ms (slow)' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
