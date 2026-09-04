/**
 * ocrDetector.ts
 *
 * STEP 3 & 4 — Captures a screenshot of visible areas not covered by DOM text
 * extraction, then runs OCR via Tesseract.js (WASM, fully local).
 *
 * Architecture:
 * - Takes a screenshot of the visible page via chrome.tabs.captureVisibleTab
 * - Identifies DOM-uncovered regions (canvas, images, SVG text, etc.)
 * - Runs Tesseract.js on those crops
 * - Returns extracted text with bounding box coordinates
 */

export interface OcrRegion {
  imageDataUrl: string;
  offsetX: number;
  offsetY: number;
}

export interface OcrWord {
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

// ─── Identify DOM elements that need OCR ─────────────────────────────────────

export function getOcrTargetElements(): Element[] {
  const targets: Element[] = [];
  const selectors = ['canvas', 'img', 'svg', 'video', 'object', 'embed'];
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 20 && rect.height > 20) {
        targets.push(el);
      }
    });
  });
  return targets;
}

// ─── Crop a region from a screenshot data URL ─────────────────────────────────

export async function cropScreenshot(
  screenshotDataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = screenshotDataUrl;
  });
}

// ─── Run Tesseract OCR on a cropped image ─────────────────────────────────────
// In production this would import Tesseract.js. Here we provide the interface
// and stub so the module compiles without the npm package in dev.

export async function runOcr(
  imageDataUrl: string,
  offsetX = 0,
  offsetY = 0
): Promise<OcrWord[]> {
  try {
    // Dynamic import so it only loads when needed
    // @ts-ignore — tesseract.js optional dependency
    const Tesseract = await import('tesseract.js').catch(() => null);

    if (!Tesseract) {
      console.warn('[PrivacyFirewall] Tesseract.js not available. OCR skipped.');
      return [];
    }

    const worker = await Tesseract.createWorker('eng');
    const { data } = await worker.recognize(imageDataUrl);
    await worker.terminate();

    const words: OcrWord[] = [];
    for (const word of data.words) {
      if (word.confidence < 50) continue;
      words.push({
        text: word.text,
        confidence: word.confidence / 100,
        bbox: {
          x: word.bbox.x0 + offsetX,
          y: word.bbox.y0 + offsetY,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0,
        },
      });
    }
    return words;
  } catch (err) {
    console.error('[PrivacyFirewall] OCR error:', err);
    return [];
  }
}

// ─── Reconstruct lines from words ────────────────────────────────────────────

export function wordsToLines(words: OcrWord[]): Array<{ text: string; bbox: OcrWord['bbox'] }> {
  if (words.length === 0) return [];

  const lines: Array<{ text: string; bbox: OcrWord['bbox']; words: OcrWord[] }> = [];
  const sorted = [...words].sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x);

  let currentLine: { text: string; words: OcrWord[]; bbox: OcrWord['bbox'] } = { text: '', words: [sorted[0]], bbox: { ...sorted[0].bbox } };

  for (let i = 1; i < sorted.length; i++) {
    const w = sorted[i];
    const lineCenter = currentLine.bbox.y + currentLine.bbox.height / 2;
    if (Math.abs(w.bbox.y - lineCenter) < currentLine.bbox.height * 0.6) {
      currentLine.words.push(w);
      currentLine.bbox.x = Math.min(currentLine.bbox.x, w.bbox.x);
      currentLine.bbox.width =
        Math.max(currentLine.bbox.x + currentLine.bbox.width, w.bbox.x + w.bbox.width) -
        currentLine.bbox.x;
      currentLine.bbox.height = Math.max(currentLine.bbox.height, w.bbox.height);
    } else {
      lines.push(currentLine);
      currentLine = { text: '', words: [w], bbox: { ...w.bbox } };
    }
  }
  lines.push(currentLine);

  return lines.map((line) => ({
    text: line.words.map((w) => w.text).join(' '),
    bbox: line.bbox,
  }));
}
