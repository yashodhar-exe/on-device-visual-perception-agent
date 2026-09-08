/**
 * screenshotCapture.ts
 *
 * Screen Capture Engine for Privacy-Preserving Browser Vision Agent.
 * Captures visible tab viewports using Chrome MV3 captureVisibleTab,
 * converts between data URLs, HTMLCanvasElement, and ImageData,
 * and validates coordinate geometry.
 */

import { BoundingBox } from '../core/types';

/**
 * Capture visible tab viewport as base64 PNG data URL.
 * Can be called from background service worker directly,
 * or requested from content script via message.
 */
export async function captureVisibleTab(
  windowId: number | null = null
): Promise<string> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.captureVisibleTab) {
    throw new Error('chrome.tabs.captureVisibleTab is not available in current context');
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(
      windowId ?? undefined,
      { format: 'png' },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!dataUrl) {
          return reject(new Error('captureVisibleTab returned empty dataUrl'));
        }
        resolve(dataUrl);
      }
    );
  });
}

/**
 * Validates and clamps a bounding box to ensure it lies strictly
 * within the dimensions of the target image/canvas.
 */
export function validateBoundingBox(
  bbox: BoundingBox,
  maxWidth: number,
  maxHeight: number
): BoundingBox {
  const x = Math.max(0, Math.min(Math.round(bbox.x), maxWidth));
  const y = Math.max(0, Math.min(Math.round(bbox.y), maxHeight));
  const width = Math.max(1, Math.min(Math.round(bbox.width), maxWidth - x));
  const height = Math.max(1, Math.min(Math.round(bbox.height), maxHeight - y));

  return { x, y, width, height };
}

/**
 * Converts a base64 image data URL to an ImageData object for pixel-level inspection.
 * Works in DOM environments (content script / popup / tests).
 */
export async function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      // In non-DOM / test environments without Image
      return reject(new Error('dataUrlToImageData requires DOM document'));
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Failed to obtain 2D canvas context'));
      }
      ctx.drawImage(img, 0, 0);
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(new Error(`Failed to load image data URL: ${String(err)}`));
    img.src = dataUrl;
  });
}

/**
 * Crops a region from a screenshot data URL and returns the cropped base64 PNG data URL.
 */
export async function cropScreenshotDataUrl(
  dataUrl: string,
  bbox: BoundingBox
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      return reject(new Error('cropScreenshotDataUrl requires DOM document'));
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const clamped = validateBoundingBox(bbox, img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = clamped.width;
      canvas.height = clamped.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Failed to get 2d context for crop'));
      }
      ctx.drawImage(
        img,
        clamped.x,
        clamped.y,
        clamped.width,
        clamped.height,
        0,
        0,
        clamped.width,
        clamped.height
      );
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(new Error(`Crop image load failed: ${String(err)}`));
    img.src = dataUrl;
  });
}
