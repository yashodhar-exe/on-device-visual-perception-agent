/**
 * faceDetector.ts
 *
 * Computer Vision — detect faces in the page using face-api.js (TensorFlow.js backend).
 * Runs 100% locally inside the browser. No data leaves the extension.
 *
 * Models used:
 *  - tinyFaceDetector (fast, lightweight — ~190KB)
 *
 * In production: load models from extension's local /models directory.
 */

import { BoundingBox } from '../core/types';

export interface FaceDetection {
  boundingBox: BoundingBox;
  confidence: number;
}

// ─── Load face-api.js models (lazy) ──────────────────────────────────────────

let faceApiLoaded = false;

export async function loadFaceApiModels(modelUrl: string): Promise<boolean> {
  try {
    // @ts-ignore — face-api.js optional dependency
    const faceapi = await import('face-api.js').catch(() => null);
    if (!faceapi) return false;

    await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
    faceApiLoaded = true;
    return true;
  } catch (err) {
    console.warn('[PrivacyFirewall] face-api.js load failed:', err);
    return false;
  }
}

// ─── Detect faces in an img element ──────────────────────────────────────────

export async function detectFacesInImage(
  imgEl: HTMLImageElement
): Promise<FaceDetection[]> {
  if (!faceApiLoaded) return [];

  try {
    // @ts-ignore
    const faceapi = await import('face-api.js');
    const detections = await faceapi
      .detectAllFaces(imgEl, new faceapi.TinyFaceDetectorOptions())
      .run();

    const rect = imgEl.getBoundingClientRect();

    return detections.map((d: any) => ({
      boundingBox: {
        x: Math.round(rect.left + window.scrollX + d.box.x),
        y: Math.round(rect.top + window.scrollY + d.box.y),
        width: Math.round(d.box.width),
        height: Math.round(d.box.height),
      },
      confidence: d.score ?? 0.8,
    }));
  } catch (err) {
    console.error('[PrivacyFirewall] Face detection error:', err);
    return [];
  }
}

// ─── Run face detection on all img tags ──────────────────────────────────────

export async function detectAllFacesOnPage(): Promise<FaceDetection[]> {
  const results: FaceDetection[] = [];
  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>('img')
  ).filter((img) => {
    const rect = img.getBoundingClientRect();
    return (
      rect.width >= 60 &&
      rect.height >= 60 &&
      img.complete &&
      img.naturalWidth > 0
    );
  });

  for (const img of images) {
    const faces = await detectFacesInImage(img);
    results.push(...faces);
  }

  return results;
}
