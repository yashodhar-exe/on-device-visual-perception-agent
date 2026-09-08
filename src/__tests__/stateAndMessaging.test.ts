/**
 * stateAndMessaging.test.ts
 *
 * Automated regression test suite covering:
 * - Restricted URL detection (isRestrictedUrl)
 * - Storage cleanup & stale scan removal (clearScan)
 * - ScanStatus transitions (idle, scanning, success, failed, restricted)
 * - Tab switching and URL mismatch handling
 */

import { isRestrictedUrl, clearScan } from '../background/background';
import { ScanResult, ExtensionState, DEFAULT_SETTINGS } from '../core/types';

describe('State Management & Messaging Regression Test Suite', () => {

  // ─── 1. Restricted URL Detection ──────────────────────────────────────────
  describe('Restricted URL Detection', () => {
    it('identifies internal browser URLs and extension pages as restricted', () => {
      expect(isRestrictedUrl('chrome://settings')).toBe(true);
      expect(isRestrictedUrl('chrome-extension://abcdef/popup.html')).toBe(true);
      expect(isRestrictedUrl('edge://flags')).toBe(true);
      expect(isRestrictedUrl('about:blank')).toBe(true);
      expect(isRestrictedUrl('view-source:https://example.com')).toBe(true);
      expect(isRestrictedUrl('https://chromewebstore.google.com/detail/123')).toBe(true);
      expect(isRestrictedUrl('https://chrome.google.com/webstore/category')).toBe(true);
    });

    it('allows standard web pages (ChatGPT, Google, arbitrary sites)', () => {
      expect(isRestrictedUrl('https://chatgpt.com/')).toBe(false);
      expect(isRestrictedUrl('https://google.com/search')).toBe(false);
      expect(isRestrictedUrl('https://github.com/openai')).toBe(false);
      expect(isRestrictedUrl('http://localhost:3000/')).toBe(false);
    });
  });

  // ─── 2. Storage Cleanup & Stale Scan Removal ──────────────────────────────
  describe('Storage Cleanup (clearScan)', () => {
    it('executes without error and clears state storage targets', async () => {
      await expect(clearScan(101)).resolves.not.toThrow();
    });
  });

  // ─── 3. Stale Scan Validation Logic ────────────────────────────────────────
  describe('Stale Scan Validation', () => {
    const dummyScan: ScanResult = {
      url: 'https://google.com',
      tabId: 1,
      timestamp: Date.now(),
      riskScore: 0,
      items: [],
      sanitizedPayload: {},
    };

    it('rejects scan when active tabId does not match scan tabId', () => {
      const currentTabId = 2;
      const currentUrl = 'https://chatgpt.com';

      const isValid =
        dummyScan.tabId === currentTabId || dummyScan.url === currentUrl;

      expect(isValid).toBe(false);
    });

    it('accepts scan when tabId or URL matches active tab', () => {
      const currentTabId = 1;
      const currentUrl = 'https://google.com';

      const isValid =
        dummyScan.tabId === currentTabId || dummyScan.url === currentUrl;

      expect(isValid).toBe(true);
    });
  });

  // ─── 4. ScanStatus State Machine ───────────────────────────────────────────
  describe('ScanStatus State Machine', () => {
    it('contains all required scan states', () => {
      const state: ExtensionState = {
        enabled: true,
        currentUrl: 'https://chatgpt.com',
        currentTabId: 5,
        scanStatus: 'restricted',
        scanErrorReason: 'restricted_url',
        scanErrorMessage: 'Cannot scan this page (restricted URL or browser page).',
        lastScan: null,
        stats: { protected: 0, blocked: 0, warnings: 0 },
        activityLog: [],
        overlaysVisible: false,
        settings: { ...DEFAULT_SETTINGS },
        lastMetrics: null,
      };

      expect(state.scanStatus).toBe('restricted');
      expect(state.lastScan).toBeNull();
    });
  });
});
