// ScanReportExport.tsx — P1: Enterprise Scan Report with downloadable JSON

import React, { useState, useCallback } from 'react';
import { ScanResult, ExtensionMessage } from '../../core/types';
import { buildScanReport } from '../../core/utils';

interface ScanReportExportProps {
  scan: ScanResult | null;
}

export const ScanReportExport: React.FC<ScanReportExportProps> = ({ scan }) => {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const exportReport = useCallback(() => {
    if (!scan) return;
    setExporting(true);

    try {
      const report = buildScanReport(scan);
      const json = JSON.stringify(report, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const hostname = (() => {
        try { return new URL(scan.url).hostname; } catch { return 'page'; }
      })();
      const filename = `privacy-firewall-report-${hostname}-${Date.now()}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } finally {
      setExporting(false);
    }
  }, [scan]);

  if (!scan) return null;

  const report = buildScanReport(scan);

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px 6px',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Scan Report
        </span>
        <button
          id="btn-export-report"
          onClick={exportReport}
          disabled={exporting}
          aria-label="Export scan report as JSON"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: exported ? 'var(--success)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: exporting ? 'default' : 'pointer',
            opacity: exporting ? 0.7 : 1,
            transition: 'background 0.3s',
          }}
        >
          <span>{exported ? '✓' : '↓'}</span>
          <span>{exported ? 'Exported!' : 'Export JSON'}</span>
        </button>
      </div>

      {/* Report summary */}
      <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Key metrics grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
          }}
        >
          {[
            { label: 'Website', value: report.website },
            { label: 'Risk Score', value: `${report.riskScore}/100` },
            { label: 'Detections', value: String(report.totalDetections) },
            { label: 'Avg Confidence', value: `${Math.round(report.confidenceAvg * 100)}%` },
            { label: 'Scanned At', value: new Date(report.timestamp).toLocaleTimeString() },
            { label: 'Report ID', value: report.id.slice(3, 16) },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 8px',
              }}
            >
              <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                {label}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Categories */}
        {Object.keys(report.categories).length > 0 && (
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 8px',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Categories
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {Object.entries(report.categories).map(([type, count]) => (
                <span
                  key={type}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '1px 7px',
                    fontSize: '10px',
                    fontFamily: 'var(--mono)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {type}: {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Privacy note */}
        <p style={{ fontSize: '10px', color: 'var(--success)', display: 'flex', gap: '4px', alignItems: 'flex-start', margin: 0 }}>
          <span>✓</span>
          <span>Report contains only placeholders. No raw sensitive values are exported.</span>
        </p>
      </div>
    </div>
  );
};
