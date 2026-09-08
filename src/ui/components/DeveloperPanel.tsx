// DeveloperPanel.tsx — P5: Developer Mode — bounding boxes, XPath, selectors, detection source

import React from 'react';
import { DetectedItem } from '../../core/types';
import { getTypeLabel, truncateValue } from '../../core/utils';
import { OVERLAY_BORDER_COLORS } from '../../core/types';

interface DeveloperPanelProps {
  items: DetectedItem[];
}

export const DeveloperPanel: React.FC<DeveloperPanelProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
        No items detected. Run a scan to see developer details.
      </div>
    );
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {/* Header */}
      <div style={{ padding: '10px 16px 6px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Developer Details — {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Item cards */}
      <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.map((item, idx) => {
          const color = OVERLAY_BORDER_COLORS[item.type];
          const bb = item.location.boundingBox;

          return (
            <div
              key={item.id}
              style={{
                border: `1px solid ${color}44`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                background: 'var(--bg)',
              }}
            >
              {/* Item header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: color + '11',
                  borderBottom: `1px solid ${color}22`,
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color }}>
                  #{idx + 1} {getTypeLabel(item.type)}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  {Math.round(item.confidence * 100)}% · {item.method.toUpperCase()}
                </span>
              </div>

              {/* Fields */}
              <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <DevRow label="ID" value={item.id} />
                <DevRow label="Placeholder" value={item.placeholder} />
                {item.location.selector && <DevRow label="CSS Selector" value={item.location.selector} />}
                {item.location.xpath && <DevRow label="XPath" value={item.location.xpath} />}
                <DevRow
                  label="Bounding Box"
                  value={`x:${bb.x}  y:${bb.y}  w:${bb.width}  h:${bb.height}`}
                />
                <DevRow label="Page Label" value={item.location.pageLabel ?? '—'} />
                <DevRow label="Status" value={item.status} />
                <DevRow label="Detector" value={item.method} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Dev field row ─────────────────────────────────────────────────────────────

const DevRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
    <span
      style={{
        flexShrink: 0,
        width: '80px',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
        paddingTop: '1px',
      }}
    >
      {label}
    </span>
    <code
      style={{
        fontFamily: 'var(--mono)',
        fontSize: '10px',
        color: 'var(--text-primary)',
        wordBreak: 'break-all',
        lineHeight: 1.5,
        flex: 1,
      }}
    >
      {truncateValue(value, 80)}
    </code>
  </div>
);
