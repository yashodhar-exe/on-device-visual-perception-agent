// ItemsTable.tsx — Detected sensitive items table

import React, { useState } from 'react';
import { DetectedItem, DetectionType } from '../../core/types';
import { getTypeLabel, truncateValue, formatTimestamp } from '../../core/utils';
import { OVERLAY_BORDER_COLORS } from '../../core/types';

interface ItemsTableProps {
  items: DetectedItem[];
  onViewItem: (item: DetectedItem) => void;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({ items, onViewItem }) => {
  const [filter, setFilter] = useState<DetectionType | 'ALL'>('ALL');

  const filtered = filter === 'ALL' ? items : items.filter((i) => i.type === filter);

  if (items.length === 0) {
    return (
      <div
        style={{
          padding: '24px 16px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '12px',
        }}
      >
        No sensitive items detected. Run a scan to begin.
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Section header */}
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
          Detected Sensitive Items
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px',
          }}
        >
          <thead>
            <tr style={{ background: 'var(--bg)', position: 'sticky', top: 0 }}>
              {['Type', 'Location', 'Confidence', 'Status', 'Action'].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '6px 10px',
                    textAlign: 'left',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => (
              <TableRow
                key={item.id}
                item={item}
                zebra={idx % 2 === 0}
                onView={() => onViewItem(item)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Table Row ────────────────────────────────────────────────────────────────

const TableRow: React.FC<{
  item: DetectedItem;
  zebra: boolean;
  onView: () => void;
}> = ({ item, zebra, onView }) => {
  const dot = OVERLAY_BORDER_COLORS[item.type];

  return (
    <tr
      style={{
        background: zebra ? 'var(--surface)' : 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Type */}
      <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: dot,
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
            {getTypeLabel(item.type)}
          </span>
        </div>
      </td>

      {/* Location */}
      <td
        style={{
          padding: '7px 10px',
          color: 'var(--text-secondary)',
          maxWidth: '80px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={item.location.pageLabel}
      >
        {item.location.pageLabel ?? 'Page'}
      </td>

      {/* Confidence */}
      <td style={{ padding: '7px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {Math.round(item.confidence * 100)}%
      </td>

      {/* Status */}
      <td style={{ padding: '7px 10px' }}>
        <StatusBadge status={item.status} />
      </td>

      {/* Action */}
      <td style={{ padding: '7px 10px' }}>
        <button
          id={`btn-view-${item.id}`}
          onClick={onView}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 8px',
            fontSize: '11px',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          View
        </button>
      </td>
    </tr>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  detected: { bg: '#FEF3C7', color: '#92400E' },
  redacted: { bg: '#DCFCE7', color: '#166534' },
  blocked: { bg: '#FEE2E2', color: '#991B1B' },
  ignored: { bg: '#F1F5F9', color: '#64748B' },
};

const StatusBadge: React.FC<{ status: DetectedItem['status'] }> = ({ status }) => {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.ignored;
  return (
    <span
      style={{
        ...styles,
        padding: '2px 6px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.03em',
        textTransform: 'capitalize',
      }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
