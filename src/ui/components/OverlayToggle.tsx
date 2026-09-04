// OverlayToggle.tsx — Toggle overlay visibility + protection controls

import React from 'react';
import { EyeIcon } from './icons/ShieldIcon';

interface OverlayToggleProps {
  overlaysVisible: boolean;
  onToggle: () => void;
}

export const OverlayToggle: React.FC<OverlayToggleProps> = ({
  overlaysVisible,
  onToggle,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
    }}
  >
    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
      Page overlays
    </span>
    <button
      id="btn-toggle-overlays"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        background: 'none',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '3px 8px',
        fontSize: '11px',
        fontWeight: 500,
        color: overlaysVisible ? 'var(--accent)' : 'var(--text-secondary)',
        cursor: 'pointer',
      }}
    >
      <EyeIcon size={12} color={overlaysVisible ? 'var(--accent)' : 'var(--text-secondary)'} />
      {overlaysVisible ? 'Hide' : 'Show'}
    </button>
  </div>
);

// ─── Color Legend ─────────────────────────────────────────────────────────────

export const ColorLegend: React.FC = () => {
  const items = [
    { label: 'Password', color: '#B91C1C' },
    { label: 'API Key', color: '#B45309' },
    { label: 'Email', color: '#2563EB' },
    { label: 'Phone', color: '#15803D' },
    { label: 'Card', color: '#6D28D9' },
    { label: 'Address', color: '#A16207' },
  ];

  return (
    <div
      style={{
        padding: '8px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
      }}
    >
      {items.map(({ label, color }) => (
        <div
          key={label}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              background: color,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
};
