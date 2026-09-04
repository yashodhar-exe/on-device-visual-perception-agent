// Header.tsx — Top navigation bar

import React from 'react';
import { ShieldIcon } from './icons/ShieldIcon';

interface HeaderProps {
  currentUrl: string;
  isProtected: boolean;
  scanning: boolean;
  onScan: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUrl,
  isProtected,
  scanning,
  onScan,
}) => {
  const hostname = (() => {
    try {
      return new URL(currentUrl).hostname || 'No page';
    } catch {
      return 'No page';
    }
  })();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        gap: '8px',
      }}
    >
      {/* Logo + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
        <ShieldIcon size={18} color="var(--accent)" />
        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Privacy Firewall
        </span>
      </div>

      {/* Current site + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        <span
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--mono)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '140px',
          }}
          title={hostname}
        >
          {hostname}
        </span>
        <StatusDot active={isProtected} />
      </div>

      {/* Scan button */}
      <button
        id="btn-scan"
        onClick={onScan}
        disabled={scanning}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 10px',
          background: scanning ? 'var(--text-secondary)' : 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.01em',
          flexShrink: 0,
          opacity: scanning ? 0.7 : 1,
        }}
      >
        {scanning ? (
          <>
            <Spinner />
            Scanning…
          </>
        ) : (
          'Scan'
        )}
      </button>
    </header>
  );
};

const StatusDot: React.FC<{ active: boolean }> = ({ active }) => (
  <span
    style={{
      width: '7px',
      height: '7px',
      borderRadius: '50%',
      background: active ? 'var(--success)' : 'var(--text-secondary)',
      display: 'inline-block',
      flexShrink: 0,
    }}
    title={active ? 'Protected' : 'Idle'}
  />
);

const Spinner: React.FC = () => (
  <span
    style={{
      width: '10px',
      height: '10px',
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin 0.7s linear infinite',
    }}
  />
);
