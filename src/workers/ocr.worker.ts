/**
 * ocr.worker.ts
 *
 * Dedicated Web Worker for OCR execution using Tesseract.js.
 * Extracts text and bounding boxes without blocking DOM operations.
 */

export interface OcrWorkerRequest {
  type: 'OCR';
  imageDataUrl: string;
  lang?: string;
}

if (typeof self !== 'undefined') {
  self.onmessage = async (e: MessageEvent<OcrWorkerRequest>) => {
    const { type, imageDataUrl, lang = 'eng' } = e.data;

    if (type === 'OCR') {
      try {
        // @ts-ignore — optional dependency with dynamic import
        const Tesseract = await import('tesseract.js').catch(() => null);

        if (!Tesseract) {
          self.postMessage({
            type: 'OCR_COMPLETE',
            words: [],
            error: 'Tesseract.js not loaded in worker environment',
          });
          return;
        }

        const worker = await Tesseract.createWorker(lang);
        const { data } = await worker.recognize(imageDataUrl);
        await worker.terminate();

        const words = (data.words || []).map((w: any) => ({
          text: w.text,
          confidence: (w.confidence ?? 0) / 100,
          bbox: {
            x: w.bbox.x0,
            y: w.bbox.y0,
            width: w.bbox.x1 - w.bbox.x0,
            height: w.bbox.y1 - w.bbox.y0,
          },
        }));

        self.postMessage({
          type: 'OCR_COMPLETE',
          words,
          text: data.text || '',
        });
      } catch (err) {
        self.postMessage({
          type: 'OCR_ERROR',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  };
}
