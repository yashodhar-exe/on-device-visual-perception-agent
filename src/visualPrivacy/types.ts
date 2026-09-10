/**
 * types.ts
 *
 * Data types, landmarks, geometries, and interfaces for the
 * Privacy Eye-Line Image Sanitization module.
 */

export interface Point {
  x: number;
  y: number;
}

export interface EyeRegion {
  center: Point;
  outerCorner: Point;
  innerCorner: Point;
  width: number;
  height: number;
  irisRadius?: number;
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceLandmarks {
  id?: string;
  faceBox: FaceBox;
  leftEye: EyeRegion;
  rightEye: EyeRegion;
  rollAngleRad: number; // Head/eye-line tilt angle in radians
  confidence: number;
}

export interface PrivacyBandGeometry {
  center: Point;
  start: Point;
  end: Point;
  angleRad: number;
  length: number;
  thickness: number;
  polygon: Point[];
}

export interface EyeLineConfig {
  bandColor: string; // e.g. '#000000' or 'rgba(0,0,0,0.95)'
  opacity: number; // 0.0 - 1.0 (default 1.0)
  horizontalExtensionRatio: number; // Extension beyond outer eye corners (fraction of eye distance, default 0.35)
  thicknessRatio: number; // Band thickness relative to eye distance (default 0.28)
  style: 'solid' | 'semi-opaque' | 'cinematic';
}

export const DEFAULT_EYE_LINE_CONFIG: EyeLineConfig = {
  bandColor: '#000000',
  opacity: 1.0,
  horizontalExtensionRatio: 0.38,
  thicknessRatio: 0.36,
  style: 'solid',
};

export interface ImageSanitizationResult {
  sanitizedFile: File | null;
  detectedFaces: FaceLandmarks[];
  modifiedRegions: PrivacyBandGeometry[];
  verificationPassed: boolean;
  status: 'SANITIZED' | 'NO_FACES' | 'FAILED' | 'BLOCKED';
  error?: string;
  metadata: {
    originalFileName?: string;
    mimeType: string;
    originalWidth: number;
    originalHeight: number;
    sanitizedWidth: number;
    sanitizedHeight: number;
    originalSize: number;
    sanitizedSize: number;
    processingTimeMs: number;
  };
}

export type AttachmentPrivacyStatus =
  | 'IDLE'
  | 'CHECKING'
  | 'SANITIZED'
  | 'FAILED'
  | 'BLOCKED';

export type AttachmentPrivacyState =
  | 'NONE'
  | 'NO_IMAGE'
  | 'UPLOADED'
  | 'PROCESSING'
  | 'VERIFIED'
  | 'FAILED';

export interface TrackedAttachment {
  id: string;
  originalFile: File;
  sanitizedFile: File | null;
  uploadFile: File | null;
  originalHash?: string;
  sanitizedHash?: string;
  privacyStatus: 'PENDING' | 'VERIFIED' | 'FAILED' | 'NO_FACES';
  version: number;
  previewUrl: string | null;
  modifiedRegions: PrivacyBandGeometry[];
}
