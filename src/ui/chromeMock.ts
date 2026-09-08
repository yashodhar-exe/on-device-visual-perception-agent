/**
 * chromeMock.ts — Development mock for chrome.* APIs
 *
 * Polyfills the chrome global when running in a normal web context (npm start).
 * Does NOT overwrite an existing chrome global (real extension context).
 */

import { ExtensionState, ScanResult, DEFAULT_SETTINGS, ScanMetrics } from '../core/types';

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockScan: ScanResult = {
  url: 'https://example.com/login',
  tabId: 1,
  timestamp: Date.now(),
  riskScore: 65,
  sanitizedPayload: {
    email: '[EMAIL]',
    password: '[PASSWORD]',
    credit_card: '[CARD]',
    api_key: '[API_KEY]',
  },
  metrics: {
    domScanMs: 12.4,
    regexMs: 12.4,
    nerMs: 5.1,
    ocrMs: 0,
    faceMs: 0.2,
    overlayRenderMs: 3.8,
    totalMs: 21.5,
  } as ScanMetrics,
  items: [
    {
      id: 'pf-mock-1',
      type: 'PASSWORD',
      value: '••••••••',
      placeholder: '[PASSWORD]',
      confidence: 1.0,
      method: 'dom',
      status: 'redacted',
      location: {
        boundingBox: { x: 120, y: 300, width: 220, height: 36 },
        selector: 'input[type=password]',
        xpath: '/html/body/form/input[2]',
        cssPath: 'form > input:nth-of-type(2)',
        pageLabel: 'Login Form',
      },
      timestamp: Date.now() - 5000,
    },
    {
      id: 'pf-mock-2',
      type: 'EMAIL',
      value: 'john.doe@example.com',
      placeholder: '[EMAIL]',
      confidence: 0.99,
      method: 'regex',
      status: 'redacted',
      location: {
        boundingBox: { x: 120, y: 250, width: 220, height: 36 },
        selector: 'input[type=email]',
        xpath: '/html/body/form/input[1]',
        cssPath: 'form > input:nth-of-type(1)',
        pageLabel: 'Login Form',
      },
      timestamp: Date.now() - 4000,
    },
    {
      id: 'pf-mock-3',
      type: 'CARD',
      value: '4111111111111111',
      placeholder: '[CARD]',
      confidence: 0.99,
      method: 'regex',
      status: 'blocked',
      location: {
        boundingBox: { x: 120, y: 400, width: 220, height: 36 },
        selector: '#card-number',
        xpath: '/html/body/div/input',
        cssPath: '#card-number',
        pageLabel: 'Payment Section',
      },
      timestamp: Date.now() - 3000,
    },
    {
      id: 'pf-mock-4',
      type: 'OPENAI_KEY',
      value: 'sk-proj-abc123xyz...',
      placeholder: '[OPENAI_KEY]',
      confidence: 1.0,
      method: 'regex',
      status: 'blocked',
      location: {
        boundingBox: { x: 50, y: 500, width: 340, height: 24 },
        selector: 'textarea#api-config',
        xpath: '/html/body/textarea',
        cssPath: 'textarea#api-config',
        pageLabel: 'Textarea (line 12)',
      },
      timestamp: Date.now() - 2000,
    },
    {
      id: 'pf-mock-5',
      type: 'PHONE',
      value: '+1-555-867-5309',
      placeholder: '[PHONE]',
      confidence: 0.94,
      method: 'regex',
      status: 'redacted',
      location: {
        boundingBox: { x: 120, y: 350, width: 180, height: 36 },
        selector: 'input[name=phone]',
        xpath: '/html/body/form/input[3]',
        cssPath: 'form > input:nth-of-type(3)',
        pageLabel: 'Contact Form',
      },
      timestamp: Date.now() - 1000,
    },
  ],
};

const mockState: ExtensionState = {
  enabled: true,
  currentUrl: 'https://example.com/login',
  currentTabId: 1,
  scanStatus: 'success',
  scanErrorReason: null,
  scanErrorMessage: null,
  lastScan: mockScan,
  stats: { protected: 3, blocked: 2, warnings: 0 },
  activityLog: [
    { id: 'e1', timestamp: Date.now() - 10000, type: 'PASSWORD', action: 'Password field detected and redacted', url: 'https://example.com' },
    { id: 'e2', timestamp: Date.now() - 9000, type: 'EMAIL', action: 'Email address redacted', url: 'https://example.com' },
    { id: 'e3', timestamp: Date.now() - 8000, type: 'API_KEY', action: 'API key detected and redacted', url: 'https://example.com' },
    { id: 'e4', timestamp: Date.now() - 7000, type: 'JWT_SECRET', action: 'JWT secret blocked', url: 'https://example.com' },
    { id: 'e5', timestamp: Date.now() - 6000, type: 'CARD', action: 'Sanitized payload generated', url: 'https://example.com' },
  ],
  overlaysVisible: true,
  settings: { ...DEFAULT_SETTINGS },
  lastMetrics: {
    domScanMs: 12.4,
    regexMs: 12.4,
    nerMs: 5.1,
    ocrMs: 0,
    faceMs: 0.2,
    overlayRenderMs: 3.8,
    totalMs: 21.5,
  } as ScanMetrics,
};

// ─── Install mock if we're not in a real extension context ──────────────────
// In a real extension, chrome.runtime is defined. In a web page or dev server, it's not.

const w = window as any;
if (!w.chrome || !w.chrome.runtime) {
  w.chrome = {
    runtime: {
      sendMessage: (_msg: any, cb?: Function) => {
        setTimeout(() => {
          if (!cb) return;
          const msg = _msg as { type: string };
          if (msg.type === 'GET_STATE') cb({ state: mockState });
          else if (msg.type === 'GET_SETTINGS') cb({ settings: mockState.settings });
          else if (msg.type === 'SAVE_SETTINGS') cb({ ok: true });
          else if (msg.type === 'GET_REPORT') cb({ report: null });
          else cb({ state: mockState, result: mockScan });
        }, 0);
      },
      onMessage: {
        addListener: (_fn: any) => {},
        removeListener: (_fn: any) => {},
      },
      lastError: undefined,
    },
    tabs: {
      query: (_q: any, cb: Function) => {
        cb([{ id: 1, url: 'https://example.com/login', active: true }]);
      },
      sendMessage: (_id: number, _msg: any, cb?: Function) => {
        if (cb) cb({ result: mockScan });
      },
      get: (_id: number) => Promise.resolve({ id: 1, url: 'https://example.com/login', active: true }),
      onActivated: { addListener: (_fn: any) => {} },
      onUpdated: { addListener: (_fn: any) => {} },
    },
    storage: {
      local: {
        get: () => Promise.resolve({ pfSettings: { enabled: true, overlaysVisible: false, activityLog: [], settings: DEFAULT_SETTINGS } }),
        set: () => Promise.resolve(),
        remove: () => Promise.resolve(),
      },
      session: {
        get: () => Promise.resolve({ pfScan: mockScan }),
        set: () => Promise.resolve(),
        remove: () => Promise.resolve(),
      },
    },
    action: {
      setBadgeText: () => {},
      setBadgeBackgroundColor: () => {},
    },
    scripting: {
      executeScript: () => Promise.resolve([]),
    },
  };
}

export {};
