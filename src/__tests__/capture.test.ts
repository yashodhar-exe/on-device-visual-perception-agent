/**
 * capture.test.ts
 *
 * Tests for Screenshot Capture Engine:
 * - Bounding box geometry validation and clamping
 * - chrome.tabs.captureVisibleTab wrapper with error handling
 * - Viewport dimension calculations
 */

import { validateBoundingBox, captureVisibleTab } from '../capture/screenshotCapture';

describe('ScreenshotCapture Engine', () => {
  describe('validateBoundingBox', () => {
    it('clamps coordinates to stay within image boundaries', () => {
      const clamped = validateBoundingBox(
        { x: -10, y: -5, width: 200, height: 150 },
        500,
        400
      );

      expect(clamped.x).toBe(0);
      expect(clamped.y).toBe(0);
      expect(clamped.width).toBe(200);
      expect(clamped.height).toBe(150);
    });

    it('clamps width and height when extending past image dimensions', () => {
      const clamped = validateBoundingBox(
        { x: 450, y: 350, width: 100, height: 100 },
        500,
        400
      );

      expect(clamped.x).toBe(450);
      expect(clamped.y).toBe(350);
      expect(clamped.width).toBe(50); // 500 - 450
      expect(clamped.height).toBe(50); // 400 - 350
    });

    it('ensures minimum 1px dimension for zero-width boxes', () => {
      const clamped = validateBoundingBox(
        { x: 10, y: 10, width: 0, height: 0 },
        500,
        400
      );

      expect(clamped.width).toBeGreaterThanOrEqual(1);
      expect(clamped.height).toBeGreaterThanOrEqual(1);
    });
  });

  describe('captureVisibleTab', () => {
    const originalChrome = (global as any).chrome;

    afterEach(() => {
      (global as any).chrome = originalChrome;
    });

    it('throws error when chrome.tabs.captureVisibleTab is not defined', async () => {
      (global as any).chrome = {};
      await expect(captureVisibleTab()).rejects.toThrow(
        'chrome.tabs.captureVisibleTab is not available'
      );
    });

    it('resolves data URL on successful chrome API invocation', async () => {
      const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      (global as any).chrome = {
        tabs: {
          captureVisibleTab: jest.fn((windowId: any, options: any, callback: (dataUrl: string) => void) => {
            callback(mockDataUrl);
          }),
        },
        runtime: {},
      };

      const result = await captureVisibleTab();
      expect(result).toBe(mockDataUrl);
    });

    it('rejects with error when chrome.runtime.lastError is present', async () => {
      (global as any).chrome = {
        tabs: {
          captureVisibleTab: jest.fn((windowId: any, options: any, callback: (dataUrl: string) => void) => {
            callback('');
          }),
        },
        runtime: {
          lastError: { message: 'Cannot capture tab in current state' },
        },
      };

      await expect(captureVisibleTab()).rejects.toThrow(
        'Cannot capture tab in current state'
      );
    });
  });
});
