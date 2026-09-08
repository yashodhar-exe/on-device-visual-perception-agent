// AnalyticsChart.tsx — P2: Detection Analytics dashboard section

import React from 'react';
import { DetectedItem, CATEGORY_GROUPS, OVERLAY_BORDER_COLORS } from '../../core/types';
import { getTypeLabel } from '../../core/utils';

interface AnalyticsChartProps {
  items: DetectedItem[];
}

interface CategoryStat {
  label: string;
  count: number;
  color: string;
  types: string[];
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
        No detections yet. Run a scan to see analytics.
      </div>
    );
  }

  const categoryColors: Record<string, string> = {
    Passwords: '#B91C1C',
    Emails: '#2563EB',
    Cards: '#6D28D9',
    Phones: '#15803D',
    Identities: '#A16207',
    Secrets: '#B45309',
    Other: '#64748B',
  };

  const stats: CategoryStat[] = Object.entries(CATEGORY_GROUPS).map(([label, types]) => {
    const count = items.filter((i) => types.includes(i.type)).length;
    return { label, count, color: categoryColors[label] ?? '#64748B', types };
  }).filter((s) => s.count > 0);

  const maxCount = Math.max(...stats.map((s) => s.count), 1);

  return (
    <div>
      {/* Section header */}
      <div style={{ padding: '10px 16px 4px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Detection Analytics
        </span>
      </div>

      {/* Category bars */}
      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {stats.map((cat) => (
          <div key={cat.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {cat.label}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--mono)' }}>
                {cat.count}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'var(--border)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
              role="progressbar"
              aria-valuenow={cat.count}
              aria-valuemax={maxCount}
              aria-label={`${cat.label}: ${cat.count} detection${cat.count !== 1 ? 's' : ''}`}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(cat.count / maxCount) * 100}%`,
                  background: cat.color,
                  borderRadius: '3px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Per-type breakdown */}
      <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        {items.map((item, idx) => {
          const color = OVERLAY_BORDER_COLORS[item.type] ?? '#64748B';
          return (
            <span
              key={idx}
              title={`${getTypeLabel(item.type)} — ${Math.round(item.confidence * 100)}% confidence`}
              style={{
                padding: '2px 7px',
                background: color + '22',
                border: `1px solid ${color}44`,
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: 500,
                color,
                fontFamily: 'var(--mono)',
                whiteSpace: 'nowrap',
              }}
            >
              {getTypeLabel(item.type)}
            </span>
          );
        })}
      </div>
    </div>
  );
};
