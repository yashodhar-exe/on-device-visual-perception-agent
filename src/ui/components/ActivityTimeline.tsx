// ActivityTimeline.tsx — Recent detection activity

import React from 'react';
import { ActivityEvent } from '../../core/types';
import { getTypeLabel, formatTimestamp } from '../../core/utils';
import { OVERLAY_BORDER_COLORS } from '../../core/types';

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ events }) => {
  const recent = events.slice(0, 6);

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
          Recent Activity
        </span>
        {events.length > 6 && (
          <span style={{ fontSize: '11px', color: 'var(--accent)', cursor: 'pointer' }}>
            View all
          </span>
        )}
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        {recent.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 0' }}>
            No activity yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {recent.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const EventRow: React.FC<{ event: ActivityEvent }> = ({ event }) => {
  const dot = OVERLAY_BORDER_COLORS[event.type] ?? '#64748B';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Color dot */}
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: dot,
          flexShrink: 0,
        }}
      />

      {/* Timestamp */}
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '10px',
          color: 'var(--text-secondary)',
          flexShrink: 0,
        }}
      >
        {formatTimestamp(event.timestamp)}
      </span>

      {/* Description */}
      <span style={{ fontSize: '12px', color: 'var(--text-primary)', flex: 1 }}>
        {event.action}
      </span>
    </div>
  );
};
