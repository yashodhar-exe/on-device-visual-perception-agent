/**
 * logger.ts
 *
 * Diagnostic logging for the visual privacy pipeline.
 *
 * Traces required privacy states without exposing image contents,
 * base64 data, OCR text, biometric information, or raw pixel data.
 */

export type VisualPrivacyLogState =
  | 'IMAGE_SELECTED'
  | 'IMAGE_PROCESSING'
  | 'FACE_DETECTION_STARTED'
  | 'FACE_DETECTION_COMPLETED'
  | 'EYE_LANDMARKS_FOUND'
  | 'SANITIZATION_STARTED'
  | 'SANITIZATION_COMPLETED'
  | 'SANITIZED_BLOB_CREATED'
  | 'SANITIZED_IMAGE_VERIFIED'
  | 'ATTACHMENT_REPLACED'
  | 'PRIVACY_VERIFIED'
  | 'SEND_GATE_EVALUATED'
  | 'SEND_ENABLED';

export function logVisualPrivacyState(
  state: VisualPrivacyLogState | string,
  details?: Record<string, any>
): void {
  const meta = details ? ` | ${JSON.stringify(details)}` : '';
  console.log(`[PrivacyFirewall:VisualPrivacy] ${state}${meta}`);
}
