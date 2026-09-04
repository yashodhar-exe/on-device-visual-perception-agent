// RiskScore.tsx — Circular risk gauge + overview stats

import React from 'react';
import { ProtectionStats } from '../../core/types';

interface RiskScoreProps {
  score: number;
  stats: ProtectionStats;
  itemCount: number;
}

export const RiskScore: React.FC<RiskScoreProps> = ({ score, stats, itemCount }) => {
  const { label, color } = getRiskLevel(score);
  const circumference = 2 * Math.PI * 28; // r=28
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '14px 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Gauge */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width="68" height="68" viewBox="0 0 68 68">
          {/* Track */}
          <circle
            cx="34" cy="34" r="28"
            fill="none"
            stroke="var(--border)"
            strokeWidth="5"
          />
          {/* Progress */}
          <circle
            cx="34" cy="34" r="28"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 34 34)"
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 700, color, lineHeight: 1 }}>
            {score}
          </span>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginTop: '1px' }}>
            {label}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
        <StatCard label="Detected" value={itemCount} color="var(--text-primary)" />
        <StatCard label="Protected" value={stats.protected} color="var(--success)" />
        <StatCard label="Blocked" value={stats.blocked} color="var(--danger)" />
        <StatCard label="Warnings" value={stats.warnings} color="var(--warning)" />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({
  label, value, color,
}) => (
  <div style={{ textAlign: 'center', flex: 1 }}>
    <div style={{ fontSize: '20px', fontWeight: 700, color, lineHeight: 1 }}>
      {value}
    </div>
    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px', letterSpacing: '0.02em' }}>
      {label}
    </div>
  </div>
);

function getRiskLevel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'HIGH', color: 'var(--danger)' };
  if (score >= 40) return { label: 'MED', color: 'var(--warning)' };
  return { label: 'LOW', color: 'var(--success)' };
}
