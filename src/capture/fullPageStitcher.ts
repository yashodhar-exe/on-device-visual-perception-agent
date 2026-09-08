/**
 * fullPageStitcher.ts
 *
 * Slices the page viewport, scrolls incrementally, captures viewports,
 * and stitches them into a composite full-page image.
 *
 * Runs within content script context where window scrolling and DOM metrics are available.
 */

export interface FullPageCaptureOptions {
  maxHeight?: number;
  scrollDelayMs?: number;
  captureViewport: () => Promise<string>;
}

const DEFAULT_OPTIONS: Required<FullPageCaptureOptions> = {
  maxHeight: 8000, // Safety limit to avoid unbounded canvas memory
  scrollDelayMs: 120, // Wait for DOM re-render & lazy assets
  captureViewport: async () => '',
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Loads an image from a data URL into an HTMLImageElement.
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load slice: ${String(err)}`));
    img.src = dataUrl;
  });
}

/**
 * Captures full page by scrolling through viewports and stitching into a single canvas.
 */
export async function captureFullPage(
  options: FullPageCaptureOptions
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('captureFullPage can only be executed in a browser DOM context');
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const totalHeight = Math.min(
    Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      viewportHeight
    ),
    opts.maxHeight
  );

  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;

  const slices: Array<{ y: number; dataUrl: string }> = [];

  try {
    let currentY = 0;
    while (currentY < totalHeight) {
      window.scrollTo(0, currentY);
      await sleep(opts.scrollDelayMs);

      const dataUrl = await opts.captureViewport();
      if (dataUrl) {
        slices.push({ y: currentY, dataUrl });
      }

      // If at bottom, break
      if (currentY + viewportHeight >= totalHeight) {
        break;
      }
      currentY += viewportHeight;
    }

    if (slices.length === 0) {
      throw new Error('No viewports were captured');
    }

    // If only one slice captured, return it directly
    if (slices.length === 1) {
      return slices[0].dataUrl;
    }

    // Composite slices on a canvas
    const canvas = document.createElement('canvas');
    canvas.width = viewportWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D canvas context for full-page stitching');
    }

    for (const slice of slices) {
      const img = await loadImage(slice.dataUrl);
      ctx.drawImage(img, 0, slice.y, viewportWidth, viewportHeight);
    }

    return canvas.toDataURL('image/png');
  } finally {
    // Always restore user's original scroll position
    window.scrollTo(originalScrollX, originalScrollY);
  }
}
