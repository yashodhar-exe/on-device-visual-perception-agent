/**
 * ocrEngine.ts
 *
 * Full-page and regional Optical Character Recognition (OCR) engine
 * powered by Tesseract.js running 100% client-side.
 *
 * Features:
 *  - Full screenshot OCR text & bounding box extraction
 *  - Region-targeted crop OCR for canvases, charts, and images
 *  - Multilingual support (English 'eng' and Hindi 'hin')
 *  - Graceful fallback when Tesseract is not bundled/installed
 */

import { OcrResult, BoundingBox } from '../core/types';
import { cropScreenshot, OcrWord } from '../detectors/ocrDetector';
import { sanitizeRawText } from '../sanitization/sanitizer';

export class OcrEngine {
  private defaultLang = 'eng';

  constructor(lang = 'eng') {
    this.defaultLang = lang;
  }

  /**
   * Run OCR on a screenshot data URL.
   * Returns list of detected text segments with coordinates and confidence scores.
   */
  async extractText(imageDataUrl: string, lang?: string): Promise<OcrResult[]> {
    const selectedLang = lang || this.defaultLang;

    try {
      // Dynamic import to prevent bundler errors if not installed
      // @ts-ignore
      const Tesseract = await import('tesseract.js').catch(() => null);

      if (!Tesseract) {
        return [];
      }

      const worker = await Tesseract.createWorker(selectedLang);
      const { data } = await worker.recognize(imageDataUrl);
      await worker.terminate();

      const results: OcrResult[] = [];
      const words: OcrWord[] = data.words || [];

      for (const w of words) {
        if (!w.text || (w.confidence ?? 0) < 40) continue;

        results.push({
          text: w.text.trim(),
          confidence: (w.confidence ?? 70) / 100,
          boundingBox: {
            x: (w as any).bbox?.x0 ?? 0,
            y: (w as any).bbox?.y0 ?? 0,
            width: ((w as any).bbox?.x1 ?? 0) - ((w as any).bbox?.x0 ?? 0),
            height: ((w as any).bbox?.y1 ?? 0) - ((w as any).bbox?.y0 ?? 0),
          },
        });
      }

      return results;
    } catch (err) {
      console.warn('[PrivacyFirewall] OcrEngine extraction failed:', err);
      return [];
    }
  }

  /**
   * Run OCR on specific bounding-box regions of a screenshot.
   */
  async extractRegions(
    imageDataUrl: string,
    regions: BoundingBox[],
    lang?: string
  ): Promise<OcrResult[]> {
    const results: OcrResult[] = [];

    for (const region of regions) {
      try {
        const croppedUrl = await cropScreenshot(
          imageDataUrl,
          region.x,
          region.y,
          region.width,
          region.height
        );

        const cropResults = await this.extractText(croppedUrl, lang);
        for (const res of cropResults) {
          results.push({
            text: res.text,
            confidence: res.confidence,
            boundingBox: {
              x: region.x + res.boundingBox.x,
              y: region.y + res.boundingBox.y,
              width: res.boundingBox.width,
              height: res.boundingBox.height,
            },
          });
        }
      } catch (err) {
        console.warn('[PrivacyFirewall] Failed region OCR for bounding box:', region, err);
      }
    }

    return results;
  }
}

/**
 * Sanitizes OCR results by replacing raw secrets in the OCR text with semantic placeholders.
 * e.g. "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ..." -> "NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY"
 */
export function sanitizeOcrResults(results: OcrResult[]): OcrResult[] {
  return results.map((item) => ({
    ...item,
    text: sanitizeRawText(item.text),
  }));
}

/**
 * Sanitizes raw OCR text before network transmission.
 */
export function sanitizeOcrText(rawText: string): string {
  return sanitizeRawText(rawText);
}
