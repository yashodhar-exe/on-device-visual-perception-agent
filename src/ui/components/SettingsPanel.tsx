// SettingsPanel.tsx — P4: Extension Settings with persistence

import React, { useState, useEffect, useCallback } from 'react';
import { ExtensionSettings, DEFAULT_SETTINGS, ExtensionMessage } from '../../core/types';

export const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>({ ...DEFAULT_SETTINGS });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load settings from background on mount
  useEffect(() => {
    try {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' } as ExtensionMessage, (res: any) => {
        if (res?.settings) setSettings(res.settings as ExtensionSettings);
      });
    } catch {
      // Dev/mock context
    }
  }, []);

  const save = useCallback((updated: ExtensionSettings) => {
    setSaving(true);
    try {
      chrome.runtime.sendMessage(
        { type: 'SAVE_SETTINGS', payload: updated } as ExtensionMessage,
        () => {
          setSaving(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        }
      );
    } catch {
      setSaving(false);
    }
  }, []);

  const toggle = useCallback((key: keyof ExtensionSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    save(updated);
  }, [settings, save]);

  type SettingGroup = {
    label: string;
    items: Array<{ key: keyof ExtensionSettings; label: string; description: string }>;
  };

  const groups: SettingGroup[] = [
    {
      label: 'Detection',
      items: [
        { key: 'detectPasswords', label: 'Passwords', description: 'Detect password input fields' },
        { key: 'detectEmails', label: 'Email Addresses', description: 'Detect email patterns via regex' },
        { key: 'detectPhones', label: 'Phone Numbers', description: 'Detect phone number patterns' },
        { key: 'detectCards', label: 'Card Numbers', description: 'Detect credit/debit card numbers' },
        { key: 'detectSecrets', label: 'Secrets & API Keys', description: 'Detect API keys, tokens, and connection strings' },
        { key: 'detectNer', label: 'Names & Addresses (NER)', description: 'Heuristic named entity recognition' },
        { key: 'detectOcr', label: 'OCR (Experimental)', description: 'Extract text from images and canvas (slow)' },
        { key: 'detectFaces', label: 'Face Detection (Experimental)', description: 'Detect faces in images using CV (requires model files)' },
      ],
    },
    {
      label: 'Behavior',
      items: [
        { key: 'autoScan', label: 'Auto Scan on Load', description: 'Automatically scan when a page loads' },
        { key: 'mutationObserver', label: 'Live Page Monitoring', description: 'Re-scan changed DOM regions automatically' },
        { key: 'networkProtection', label: 'Network Protection', description: 'Intercept and sanitize outgoing requests' },
      ],
    },
    {
      label: 'Developer',
      items: [
        { key: 'developerMode', label: 'Developer Mode', description: 'Show XPath, selectors, DOM depth, and detection source' },
      ],
    },
  ];

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px 8px',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          background: 'var(--surface)',
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Settings
        </span>
        <span
          style={{
            fontSize: '10px',
            color: saved ? 'var(--success)' : 'var(--text-secondary)',
            transition: 'color 0.3s',
          }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Auto-saved'}
        </span>
      </div>

      {groups.map((group) => (
        <div key={group.label}>
          {/* Group label */}
          <div
            style={{
              padding: '8px 16px 4px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {group.label}
          </div>

          {/* Setting rows */}
          {group.items.map(({ key, label, description }) => (
            <label
              key={key}
              htmlFor={`setting-${key}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 16px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                gap: '12px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '1px' }}>
                  {label}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {description}
                </div>
              </div>
              <Toggle
                id={`setting-${key}`}
                checked={settings[key] as boolean}
                onChange={() => toggle(key)}
                aria-label={label}
              />
            </label>
          ))}
        </div>
      ))}

      {/* Reset */}
      <div style={{ padding: '12px 16px' }}>
        <button
          id="btn-reset-settings"
          onClick={() => {
            const defaults = { ...DEFAULT_SETTINGS };
            setSettings(defaults);
            save(defaults);
          }}
          style={{
            width: '100%',
            padding: '7px',
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

// ─── Toggle Switch ─────────────────────────────────────────────────────────────

const Toggle: React.FC<{
  id: string;
  checked: boolean;
  onChange: () => void;
  'aria-label': string;
}> = ({ id, checked, onChange, 'aria-label': ariaLabel }) => (
  <button
    id={id}
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={onChange}
    style={{
      position: 'relative',
      width: '32px',
      height: '18px',
      borderRadius: '9px',
      background: checked ? 'var(--accent)' : 'var(--border)',
      border: 'none',
      cursor: 'pointer',
      transition: 'background 0.2s',
      flexShrink: 0,
      padding: 0,
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: '2px',
        left: checked ? '16px' : '2px',
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}
    />
  </button>
);
