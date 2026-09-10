/**
 * eyeRegionDetector.ts
 *
 * Local Browser Vision Face & Eye Landmark Detection Engine.
 *
 * Runs 100% locally inside the browser.
 * Extracts:
 *  - Face bounding box
 *  - Left eye region (center, outer corner, inner corner)
 *  - Right eye region (center, outer corner, inner corner)
 *  - Eye-line angle / head tilt orientation (rollAngleRad)
 *
 * Supports single face, tilted head, multiple faces, edge faces, and non-face images.
 * Never performs facial recognition or cloud identification.
 */

import { Point, EyeRegion, FaceBox, FaceLandmarks } from './types';
import { logVisualPrivacyState } from './logger';

export type CustomDetectorFn = (input: any) => Promise<FaceLandmarks[]>;

let customDetector: CustomDetectorFn | null = null;

/**
 * Register a custom or mock detector function (e.g. for testing or specialized ONNX/MediaPipe models).
 */
export function registerEyeRegionDetector(detector: CustomDetectorFn | null): void {
  customDetector = detector;
}

/**
 * Rotates a 2D point around a given pivot point by angle in radians.
 */
export function rotatePoint(p: Point, pivot: Point, angleRad: number): Point {
  if (Math.abs(angleRad) < 1e-6) {
    return { x: p.x, y: p.y };
  }
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  return {
    x: Math.round(pivot.x + (dx * cos - dy * sin)),
    y: Math.round(pivot.y + (dx * sin + dy * cos)),
  };
}

/**
 * Calculates anatomically accurate facial eye landmarks for a given face box and tilt angle.
 * In human facial anatomy:
 * - The eye line lies at ~40% of the face height from the top of the forehead/brow.
 * - Left eye center is positioned at ~33% of face width; right eye at ~67%.
 * - Outer corners extend to ~20% and ~80% of face width respectively.
 * - Rotation rotates all landmarks around the face center point.
 */
export function createAnatomicalFaceLandmarks(
  faceBox: FaceBox,
  rollAngleRad: number = 0,
  confidence: number = 0.95
): FaceLandmarks {
  const pivot: Point = {
    x: faceBox.x + faceBox.width / 2,
    y: faceBox.y + faceBox.height / 2,
  };

  const unrotatedEyeY = faceBox.y + faceBox.height * 0.40;
  const eyeWidth = Math.round(faceBox.width * 0.22);
  const eyeHeight = Math.max(10, Math.round(faceBox.height * 0.12));

  // Left eye landmarks (unrotated)
  const rawLeftCenter: Point = { x: faceBox.x + faceBox.width * 0.33, y: unrotatedEyeY };
  const rawLeftOuter: Point = { x: faceBox.x + faceBox.width * 0.20, y: unrotatedEyeY };
  const rawLeftInner: Point = { x: faceBox.x + faceBox.width * 0.44, y: unrotatedEyeY };

  // Right eye landmarks (unrotated)
  const rawRightCenter: Point = { x: faceBox.x + faceBox.width * 0.67, y: unrotatedEyeY };
  const rawRightInner: Point = { x: faceBox.x + faceBox.width * 0.56, y: unrotatedEyeY };
  const rawRightOuter: Point = { x: faceBox.x + faceBox.width * 0.80, y: unrotatedEyeY };

  // Apply tilt angle
  const leftCenter = rotatePoint(rawLeftCenter, pivot, rollAngleRad);
  const leftOuter = rotatePoint(rawLeftOuter, pivot, rollAngleRad);
  const leftInner = rotatePoint(rawLeftInner, pivot, rollAngleRad);

  const rightCenter = rotatePoint(rawRightCenter, pivot, rollAngleRad);
  const rightInner = rotatePoint(rawRightInner, pivot, rollAngleRad);
  const rightOuter = rotatePoint(rawRightOuter, pivot, rollAngleRad);

  // Compute calculated roll angle between eye centers
  const derivedAngle = Math.atan2(
    rightCenter.y - leftCenter.y,
    rightCenter.x - leftCenter.x
  );

  return {
    faceBox,
    leftEye: {
      center: leftCenter,
      outerCorner: leftOuter,
      innerCorner: leftInner,
      width: eyeWidth,
      height: eyeHeight,
      irisRadius: Math.round(eyeHeight * 0.45),
    },
    rightEye: {
      center: rightCenter,
      outerCorner: rightOuter,
      innerCorner: rightInner,
      width: eyeWidth,
      height: eyeHeight,
      irisRadius: Math.round(eyeHeight * 0.45),
    },
    rollAngleRad: derivedAngle,
    confidence,
  };
}

/**
 * Autonomous local pixel-level face and eye region detector.
 * Runs directly on image data without any external network, CDN, or library dependencies.
 */
function detectFacesLocallyFromCanvas(canvas: HTMLCanvasElement): FaceLandmarks[] {
  const ctx = (canvas.getContext('2d', { willReadFrequently: true }) ||
    canvas.getContext('2d')) as CanvasRenderingContext2D;
  if (!ctx) return [];

  const width = canvas.width;
  const height = canvas.height;
  if (width < 30 || height < 30) return [];

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, width, height);
  } catch {
    return [];
  }

  const data = imgData.data;

  // Grid-based spatial skin cluster detection
  const cellSize = Math.max(10, Math.round(Math.min(width, height) / 32));
  const gridW = Math.floor(width / cellSize);
  const gridH = Math.floor(height / cellSize);
  const skinGrid: boolean[][] = Array.from({ length: gridH }, () => new Array(gridW).fill(false));

  let totalSkinCount = 0;

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      let cellSkinPixels = 0;
      const startX = gx * cellSize;
      const startY = gy * cellSize;

      for (let y = startY; y < startY + cellSize && y < height; y += 2) {
        for (let x = startX; x < startX + cellSize && x < width; x += 2) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Human skin color chromaticity filter (inclusive YCbCr + normalized RGB)
          const isSkin =
            r > 35 && g > 20 && b > 15 && r >= g &&
            ((() => {
              const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
              const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
              return cb >= 65 && cb <= 145 && cr >= 120 && cr <= 185;
            })() || (r / (r + g + b) > 0.34 && r - g >= 0));

          if (isSkin) {
            cellSkinPixels++;
          }
        }
      }

      // If at least 15% of sampled pixels in cell are skin
      const sampledCount = Math.ceil(cellSize / 2) * Math.ceil(cellSize / 2);
      if (cellSkinPixels >= sampledCount * 0.15) {
        skinGrid[gy][gx] = true;
        totalSkinCount += cellSkinPixels;
      }
    }
  }

  // If no significant skin pixels exist, this is a clean non-human image
  if (totalSkinCount < 20) {
    return [];
  }

  // Connected component labeling to find candidate facial clusters
  const visited: boolean[][] = Array.from({ length: gridH }, () => new Array(gridW).fill(false));
  const detectedFaces: FaceLandmarks[] = [];

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      if (skinGrid[gy][gx] && !visited[gy][gx]) {
        let minX = gx;
        let maxX = gx;
        let minY = gy;
        let maxY = gy;
        let cellCount = 0;

        const queue: Array<[number, number]> = [[gx, gy]];
        visited[gy][gx] = true;

        while (queue.length > 0) {
          const [cx, cy] = queue.pop()!;
          cellCount++;
          minX = Math.min(minX, cx);
          maxX = Math.max(maxX, cx);
          minY = Math.min(minY, cy);
          maxY = Math.max(maxY, cy);

          const neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
              if (skinGrid[ny][nx] && !visited[ny][nx]) {
                visited[ny][nx] = true;
                queue.push([nx, ny]);
              }
            }
          }
        }

        // Bounding box in original pixels
        const boxX = minX * cellSize;
        const boxY = minY * cellSize;
        const boxW = Math.min(width - boxX, (maxX - minX + 1) * cellSize);
        const boxH = Math.min(height - boxY, (maxY - minY + 1) * cellSize);

        // Helper to extract facial eye landmarks from candidate box
        const extractLandmarks = (fb: FaceBox): FaceLandmarks => {
          // Eye line is strictly in 33% - 49% of face height (avoids eyebrows and forehead hair)
          const eyeBandTop = Math.max(0, Math.round(fb.y + fb.height * 0.33));
          const eyeBandBottom = Math.min(height, Math.round(fb.y + fb.height * 0.49));

          const leftMinX = Math.max(0, Math.round(fb.x + fb.width * 0.20));
          const leftMaxX = Math.min(width, Math.round(fb.x + fb.width * 0.45));
          const rightMinX = Math.max(0, Math.round(fb.x + fb.width * 0.55));
          const rightMaxX = Math.min(width, Math.round(fb.x + fb.width * 0.80));

          const defaultLeft: Point = {
            x: Math.round(fb.x + fb.width * 0.33),
            y: Math.round(fb.y + fb.height * 0.40),
          };
          const defaultRight: Point = {
            x: Math.round(fb.x + fb.width * 0.67),
            y: Math.round(fb.y + fb.height * 0.40),
          };

          let leftDarkest = 256;
          let leftEyePt: Point = { ...defaultLeft };
          let rightDarkest = 256;
          let rightEyePt: Point = { ...defaultRight };

          for (let y = eyeBandTop; y < eyeBandBottom; y += 2) {
            for (let x = leftMinX; x < leftMaxX; x += 2) {
              const idx = (y * width + x) * 4;
              const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              if (lum < leftDarkest) {
                leftDarkest = lum;
                leftEyePt = { x, y };
              }
            }
            for (let x = rightMinX; x < rightMaxX; x += 2) {
              const idx = (y * width + x) * 4;
              const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              if (lum < rightDarkest) {
                rightDarkest = lum;
                rightEyePt = { x, y };
              }
            }
          }

          // Restrict detected point within anatomical eye socket boundaries
          if (
            Math.abs(leftEyePt.x - defaultLeft.x) > fb.width * 0.12 ||
            Math.abs(leftEyePt.y - defaultLeft.y) > fb.height * 0.08
          ) {
            leftEyePt = defaultLeft;
          }
          if (
            Math.abs(rightEyePt.x - defaultRight.x) > fb.width * 0.12 ||
            Math.abs(rightEyePt.y - defaultRight.y) > fb.height * 0.08
          ) {
            rightEyePt = defaultRight;
          }

          let rollAngle = Math.atan2(rightEyePt.y - leftEyePt.y, rightEyePt.x - leftEyePt.x);
          if (Math.abs(rollAngle) > 0.55) {
            rollAngle = 0;
            leftEyePt.y = defaultLeft.y;
            rightEyePt.y = defaultRight.y;
          }

          const eyeWidth = Math.round(fb.width * 0.24);
          const eyeHeight = Math.max(12, Math.round(fb.height * 0.15));

          return {
            faceBox: fb,
            leftEye: {
              center: leftEyePt,
              outerCorner: { x: Math.round(leftEyePt.x - eyeWidth / 2), y: leftEyePt.y },
              innerCorner: { x: Math.round(leftEyePt.x + eyeWidth / 2), y: leftEyePt.y },
              width: eyeWidth,
              height: eyeHeight,
              irisRadius: Math.round(eyeHeight * 0.45),
            },
            rightEye: {
              center: rightEyePt,
              outerCorner: { x: Math.round(rightEyePt.x + eyeWidth / 2), y: rightEyePt.y },
              innerCorner: { x: Math.round(rightEyePt.x - eyeWidth / 2), y: rightEyePt.y },
              width: eyeWidth,
              height: eyeHeight,
              irisRadius: Math.round(eyeHeight * 0.45),
            },
            rollAngleRad: rollAngle,
            confidence: 0.92,
          };
        };

        // Aspect ratio and minimum size filter for human faces
        const aspectRatio = boxH / Math.max(1, boxW);

        // Case A: Single face candidate
        if (boxW >= 30 && boxH >= 30 && aspectRatio >= 0.55 && aspectRatio <= 2.2 && cellCount >= 2) {
          detectedFaces.push(extractLandmarks({ x: boxX, y: boxY, width: boxW, height: boxH }));
        }
        // Case B: Multi-person candidate cluster (e.g. multiple people standing side by side)
        else if (boxW > boxH * 1.25 && boxW >= 60 && boxH >= 30) {
          const estimatedFaces = Math.max(2, Math.min(8, Math.round(boxW / (boxH * 0.75))));
          const subW = Math.round(boxW / estimatedFaces);
          for (let p = 0; p < estimatedFaces; p++) {
            const subX = boxX + p * subW;
            const subFaceBox: FaceBox = {
              x: subX,
              y: boxY,
              width: Math.min(subW, width - subX),
              height: boxH,
            };
            detectedFaces.push(extractLandmarks(subFaceBox));
          }
        }
      }
    }
  }

  return detectedFaces;
}

/**
 * Detects human faces and exact eye landmarks from an image or canvas.
 */
export async function detectFacesAndEyes(
  input: HTMLImageElement | HTMLCanvasElement | ImageData | any
): Promise<FaceLandmarks[]> {
  logVisualPrivacyState('FACE_DETECTION_STARTED');

  // 1. Check custom / mock detector (used in test suites or registered plugins)
  if (customDetector) {
    const results = await customDetector(input);
    logVisualPrivacyState('FACE_DETECTION_COMPLETED', { faceCount: results.length });
    if (results.length > 0) {
      logVisualPrivacyState('EYE_LANDMARKS_FOUND', { faceCount: results.length });
    }
    return results;
  }

  // 2. Try window.FaceDetector (Chrome native Shape Detection API)
  if (typeof window !== 'undefined' && (window as any).FaceDetector) {
    try {
      const FaceDetectorClass = (window as any).FaceDetector;
      const fd = new FaceDetectorClass({ maxDetectedFaces: 10, fastMode: false });
      const detections = await fd.detect(input);
      if (Array.isArray(detections) && detections.length > 0) {
        const results: FaceLandmarks[] = [];
        for (const d of detections) {
          const box: FaceBox = {
            x: Math.round(d.boundingBox.x),
            y: Math.round(d.boundingBox.y),
            width: Math.round(d.boundingBox.width),
            height: Math.round(d.boundingBox.height),
          };
          let landmarks = createAnatomicalFaceLandmarks(box, 0, 0.95);
          if (Array.isArray(d.landmarks)) {
            const leftEye = d.landmarks.find((l: any) => l.type === 'eye' && l.location.x < box.x + box.width / 2);
            const rightEye = d.landmarks.find((l: any) => l.type === 'eye' && l.location.x >= box.x + box.width / 2);
            if (leftEye && rightEye) {
              const roll = Math.atan2(rightEye.location.y - leftEye.location.y, rightEye.location.x - leftEye.location.x);
              landmarks = createAnatomicalFaceLandmarks(box, roll, 0.95);
              landmarks.leftEye.center = { x: Math.round(leftEye.location.x), y: Math.round(leftEye.location.y) };
              landmarks.rightEye.center = { x: Math.round(rightEye.location.x), y: Math.round(rightEye.location.y) };
            }
          }
          results.push(landmarks);
        }
        logVisualPrivacyState('FACE_DETECTION_COMPLETED', { faceCount: results.length });
        logVisualPrivacyState('EYE_LANDMARKS_FOUND', { faceCount: results.length });
        return results;
      }
    } catch {
      // Shape Detection API failed or not active, fallback to next tier
    }
  }

  // 3. Try window.faceapi with landmarks if loaded in browser
  if (typeof window !== 'undefined' && (window as any).faceapi) {
    try {
      const faceapi = (window as any).faceapi;
      if (faceapi.detectAllFaces && faceapi.TinyFaceDetectorOptions) {
        let detections: any[];
        if (faceapi.detectAllFaces(input).withFaceLandmarks) {
          detections = await faceapi
            .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks();
        } else {
          detections = await faceapi
            .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions());
        }

        if (Array.isArray(detections) && detections.length > 0) {
          const results: FaceLandmarks[] = [];

          for (const d of detections) {
            const box: FaceBox = {
              x: Math.round(d.box?.x ?? d.detection?.box?.x ?? 0),
              y: Math.round(d.box?.y ?? d.detection?.box?.y ?? 0),
              width: Math.round(d.box?.width ?? d.detection?.box?.width ?? 0),
              height: Math.round(d.box?.height ?? d.detection?.box?.height ?? 0),
            };

            if (d.landmarks) {
              const leftEyePts = d.landmarks.getLeftEye ? d.landmarks.getLeftEye() : [];
              const rightEyePts = d.landmarks.getRightEye ? d.landmarks.getRightEye() : [];

              if (leftEyePts.length >= 2 && rightEyePts.length >= 2) {
                const avgPt = (pts: Array<{ x: number; y: number }>): Point => ({
                  x: Math.round(pts.reduce((s, p) => s + p.x, 0) / pts.length),
                  y: Math.round(pts.reduce((s, p) => s + p.y, 0) / pts.length),
                });

                const leftCenter = avgPt(leftEyePts);
                const rightCenter = avgPt(rightEyePts);
                const angle = Math.atan2(rightCenter.y - leftCenter.y, rightCenter.x - leftCenter.x);

                results.push({
                  faceBox: box,
                  leftEye: {
                    center: leftCenter,
                    outerCorner: leftEyePts[0] || leftCenter,
                    innerCorner: leftEyePts[3] || leftCenter,
                    width: Math.round(box.width * 0.22),
                    height: Math.max(10, Math.round(box.height * 0.12)),
                  },
                  rightEye: {
                    center: rightCenter,
                    outerCorner: rightEyePts[3] || rightCenter,
                    innerCorner: rightEyePts[0] || rightCenter,
                    width: Math.round(box.width * 0.22),
                    height: Math.max(10, Math.round(box.height * 0.12)),
                  },
                  rollAngleRad: angle,
                  confidence: d.detection?.score ?? 0.9,
                });
                continue;
              }
            }

            // Fallback to anatomical landmark derivation from box
            results.push(createAnatomicalFaceLandmarks(box, 0, d.score ?? 0.85));
          }

          logVisualPrivacyState('FACE_DETECTION_COMPLETED', { faceCount: results.length });
          logVisualPrivacyState('EYE_LANDMARKS_FOUND', { faceCount: results.length });
          return results;
        }
      }
    } catch {
      // faceapi failed, fallback to autonomous canvas detector
    }
  }

  // 4. Autonomous Canvas Pixel Vision Detector
  let canvasEl: HTMLCanvasElement | null = null;
  if (input instanceof HTMLCanvasElement || (input && typeof input.getContext === 'function')) {
    canvasEl = input as HTMLCanvasElement;
  } else if (typeof document !== 'undefined' && document.createElement) {
    try {
      const c = document.createElement('canvas');
      c.width = input.naturalWidth || input.width || 400;
      c.height = input.naturalHeight || input.height || 400;
      const ctx = (c.getContext('2d', { willReadFrequently: true }) ||
        c.getContext('2d')) as CanvasRenderingContext2D;
      if (ctx) {
        if (typeof ImageData !== 'undefined' && input instanceof ImageData) {
          ctx.putImageData(input, 0, 0);
        } else {
          ctx.drawImage(input, 0, 0, c.width, c.height);
        }
        canvasEl = c;
      }
    } catch {}
  }

  if (canvasEl) {
    const localDetections = detectFacesLocallyFromCanvas(canvasEl);
    logVisualPrivacyState('FACE_DETECTION_COMPLETED', { faceCount: localDetections.length });
    if (localDetections.length > 0) {
      logVisualPrivacyState('EYE_LANDMARKS_FOUND', { faceCount: localDetections.length });
    }
    return localDetections;
  }

  logVisualPrivacyState('FACE_DETECTION_COMPLETED', { faceCount: 0 });
  return [];
}
