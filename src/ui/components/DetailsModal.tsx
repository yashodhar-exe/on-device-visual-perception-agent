// DetailsModal.tsx — Item detail view modal

import React from 'react';
import { DetectedItem } from '../../core/types';
import { getTypeLabel, formatTimestamp } from '../../core/utils';
import { OVERLAY_BORDER_COLORS } from '../../core/types';

interface DetailsModalProps {
  item: DetectedItem;
  onClose: () => void;
  onRedact: (item: DetectedItem) => void;
  onBlock: (item: DetectedItem) => void;
}

export const DetailsModal: React.FC<DetailsModalProps> = ({
  item,
  onClose,
  onRedact,
  onBlock,
}) => {
  const dot = OVERLAY_BORDER_COLORS[item.type];

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,17,23,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          width: '360px',
          maxWidth: '90%',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dot }} />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{getTypeLabel(item.type)}</span>
          </div>
          <button
            id="btn-close-modal"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '16px',
              lineHeight: 1,
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Fields */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Field label="Placeholder" value={item.placeholder} mono />
          <Field label="Location" value={item.location.pageLabel ?? 'Unknown'} />
          {item.location.selector && (
            <Field label="Selector" value={item.location.selector} mono />
          )}
          {item.location.xpath && (
            <Field label="XPath" value={item.location.xpath} mono />
          )}
          <Field
            label="Bounding Box"
            value={`x:${item.location.boundingBox.x}  y:${item.location.boundingBox.y}  ${item.location.boundingBox.width}×${item.location.boundingBox.height}`}
            mono
          />
          <Field label="Confidence" value={`${Math.round(item.confidence * 100)}%`} />
          <Field label="Method" value={item.method.toUpperCase()} />
          <Field label="Detected at" value={formatTimestamp(item.timestamp)} />
          <Field label="Status" value={item.status} capitalize />
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button
            id="btn-redact-item"
            onClick={() => onRedact(item)}
            style={secondaryBtn}
          >
            Redact
          </button>
          <button
            id="btn-block-item"
            onClick={() => onBlock(item)}
            style={dangerBtn}
          >
            Block Request
          </button>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}> = ({ label, value, mono, capitalize }) => (
  <div>
    <div
      style={{
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
        marginBottom: '3px',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: mono ? 'var(--mono)' : 'var(--font)',
        fontSize: '12px',
        color: 'var(--text-primary)',
        wordBreak: 'break-all',
        background: mono ? 'var(--bg)' : 'transparent',
        padding: mono ? '5px 8px' : '0',
        borderRadius: 'var(--radius-sm)',
        textTransform: capitalize ? 'capitalize' : 'none',
      }}
    >
      {value}
    </div>
  </div>
);

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  padding: '7px',
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

const dangerBtn: React.CSSProperties = {
  flex: 1,
  padding: '7px',
  background: '#B91C1C',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  fontSize: '12px',
  fontWeight: 600,
  color: '#fff',
  cursor: 'pointer',
};
