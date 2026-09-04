// SanitizedPayloadView.tsx — Shows the safe JSON payload

import React, { useState } from 'react';

interface SanitizedPayloadViewProps {
  payload: Record<string, string>;
}

export const SanitizedPayloadView: React.FC<SanitizedPayloadViewProps> = ({ payload }) => {
  const [copied, setCopied] = useState(false);

  const json = JSON.stringify(payload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (Object.keys(payload).length === 0) return null;

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px 6px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          Sanitized Payload
        </span>
        <button
          id="btn-copy-payload"
          onClick={handleCopy}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 8px',
            fontSize: '11px',
            color: copied ? 'var(--success)' : 'var(--accent)',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div style={{ padding: '0 16px 14px' }}>
        <pre
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px',
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            color: 'var(--text-primary)',
            overflowX: 'auto',
            maxHeight: '120px',
            overflowY: 'auto',
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {json}
        </pre>
        <p
          style={{
            fontSize: '10px',
            color: 'var(--success)',
            marginTop: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>✓</span>
          <span>Raw sensitive values removed. Safe to send to LLM.</span>
        </p>
      </div>
    </div>
  );
};
