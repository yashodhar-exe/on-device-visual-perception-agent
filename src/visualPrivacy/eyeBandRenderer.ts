/**
 * eyeBandRenderer.ts
 *
 * Cinema-Style Eye-Line Privacy Band Renderer.
 *
 * Implements the horizontal / rotated identity-obscuring eye-line
 * across the eye/iris region:
 *  - Centers the band directly on the detected eye line
 *  - Extends past both outer corners by a configurable proportional margin
 *  - Follows head tilt angle via canvas rotation
 *  - Fully obscures iris, pupil, and eye landmarks
 *  - Preserves mouth, nose, forehead, and overall visual context
 */

import {
  Point,
  FaceLandmarks,
  PrivacyBandGeometry,
  EyeLineConfig,
  DEFAULT_EYE_LINE_CONFIG,
} from './types';

/**
 * Calculates the exact mathematical geometry for a rotated privacy band
 * connecting left and right eye centers.
 */
export function calculateEyeBandGeometry(
  face: FaceLandmarks,
  config: EyeLineConfig = DEFAULT_EYE_LINE_CONFIG
): PrivacyBandGeometry {
  const left = face.leftEye.center;
  const right = face.rightEye.center;

  // Vector from left to right eye
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const eyeDistance = Math.max(1, Math.hypot(dx, dy));

  // Orientation angle of the eye line
  const angleRad = Math.atan2(dy, dx);

  // Center point of the eye line
  const center: Point = {
    x: Math.round((left.x + right.x) / 2),
    y: Math.round((left.y + right.y) / 2),
  };

  // Extension beyond outer eye corners (proportional to eye distance)
  const extensionMargin = Math.round(eyeDistance * (config.horizontalExtensionRatio ?? 0.38));
  const totalLength = Math.round(eyeDistance + 2 * extensionMargin);

  // Thickness covers both upper and lower eyelids and entire iris
  const faceHeight = face.faceBox?.height || eyeDistance * 2.2;
  const proportionalThickness = Math.round(
    Math.max(
      faceHeight * 0.22,
      eyeDistance * (config.thicknessRatio ?? 0.36),
      face.leftEye.height * 1.8,
      18
    )
  );

  const halfLen = totalLength / 2;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Endpoints along the centerline of the band
  const start: Point = {
    x: Math.round(center.x - halfLen * cos),
    y: Math.round(center.y - halfLen * sin),
  };
  const end: Point = {
    x: Math.round(center.x + halfLen * cos),
    y: Math.round(center.y + halfLen * sin),
  };

  // Orthogonal vector for thickness
  const halfThick = proportionalThickness / 2;
  const perpX = -sin * halfThick;
  const perpY = cos * halfThick;

  // 4 corners of the rotated rectangular band
  const polygon: Point[] = [
    { x: Math.round(start.x + perpX), y: Math.round(start.y + perpY) },
    { x: Math.round(end.x + perpX), y: Math.round(end.y + perpY) },
    { x: Math.round(end.x - perpX), y: Math.round(end.y - perpY) },
    { x: Math.round(start.x - perpX), y: Math.round(start.y - perpY) },
  ];

  return {
    center,
    start,
    end,
    angleRad,
    length: totalLength,
    thickness: proportionalThickness,
    polygon,
  };
}

/**
 * Renders an eye privacy band onto a 2D canvas context.
 */
export function renderEyeBand(
  ctx: CanvasRenderingContext2D | any,
  geometry: PrivacyBandGeometry,
  config: EyeLineConfig = DEFAULT_EYE_LINE_CONFIG
): void {
  if (!ctx) return;

  ctx.save();
  try {
    // Translate origin to center of eye line and rotate to head tilt
    ctx.translate(geometry.center.x, geometry.center.y);
    ctx.rotate(geometry.angleRad);

    ctx.fillStyle = config.bandColor || '#000000';
    ctx.globalAlpha = config.opacity ?? 1.0;

    const halfLen = geometry.length / 2;
    const halfThick = geometry.thickness / 2;

    // Pure black, solid, opaque, rectangular eye privacy band
    ctx.fillRect(-halfLen, -halfThick, geometry.length, geometry.thickness);
  } finally {
    ctx.restore();
  }
}

/**
 * Renders eye privacy bands for all detected faces on a canvas.
 * Returns the calculated geometries for verification.
 */
export function renderAllEyeBands(
  canvas: HTMLCanvasElement | any,
  faces: FaceLandmarks[],
  config: EyeLineConfig = DEFAULT_EYE_LINE_CONFIG
): PrivacyBandGeometry[] {
  if (!canvas || faces.length === 0) return [];

  const ctx = canvas.getContext
    ? (canvas.getContext('2d', { willReadFrequently: true }) || canvas.getContext('2d'))
    : null;
  if (!ctx) return [];

  const geometries: PrivacyBandGeometry[] = [];

  for (const face of faces) {
    const geometry = calculateEyeBandGeometry(face, config);
    renderEyeBand(ctx, geometry, config);
    geometries.push(geometry);
  }

  return geometries;
}
