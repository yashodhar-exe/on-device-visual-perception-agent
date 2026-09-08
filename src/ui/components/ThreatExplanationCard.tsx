// ThreatExplanationCard.tsx — P6: Threat Explanation per detection

import React, { useState } from 'react';
import { DetectedItem } from '../../core/types';
import { buildThreatExplanation, getTypeLabel } from '../../core/utils';
import { OVERLAY_BORDER_COLORS } from '../../core/types';

interface ThreatExplanationCardProps {
  item: DetectedItem;
}

export const ThreatExplanationCard: React.FC<ThreatExplanationCardProps> = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const explanation = buildThreatExplanation(item);
  const color = OVERLAY_BORDER_COLORS[item.type];

  return (
    <div
      style={{
        border: `1px solid ${color}33`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* Header — always visible */}
      <button
        id={`threat-${item.id}`}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {getTypeLabel(item.type)}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--mono)' }}>
            {Math.round(item.confidence * 100)}%
          </span>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded explanation */}
      {expanded && (
        <div
          style={{
            padding: '0 10px 10px',
            borderTop: `1px solid ${color}22`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <ExplField icon="🔍" label="Why detected" value={explanation.why} />
          <ExplField icon="⚙️" label="Detector" value={explanation.detector} />
          <ExplField icon="📊" label="Confidence" value={explanation.confidenceReason} />
          <ExplField icon="💡" label="Recommendation" value={explanation.recommendation} highlight />
        </div>
      )}
    </div>
  );
};

// ─── Explanation field ─────────────────────────────────────────────────────────

const ExplField: React.FC<{
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ icon, label, value, highlight }) => (
  <div style={{ paddingTop: '6px' }}>
    <div
      style={{
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
        marginBottom: '3px',
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </div>
    <p
      style={{
        margin: 0,
        fontSize: '11px',
        lineHeight: 1.55,
        color: highlight ? 'var(--accent)' : 'var(--text-primary)',
        background: highlight ? 'var(--accent)0d' : 'transparent',
        padding: highlight ? '4px 6px' : '0',
        borderRadius: highlight ? 'var(--radius-sm)' : '0',
      }}
    >
      {value}
    </p>
  </div>
);

// ─── Full threat explanation list ─────────────────────────────────────────────

interface ThreatExplanationListProps {
  items: DetectedItem[];
}

export const ThreatExplanationList: React.FC<ThreatExplanationListProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
        No detections to explain.
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: '10px 16px 6px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Threat Explanations
        </span>
      </div>
      <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item) => (
          <ThreatExplanationCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};
