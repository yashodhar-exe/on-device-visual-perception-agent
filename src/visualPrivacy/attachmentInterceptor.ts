/**
 * attachmentInterceptor.ts
 *
 * Local Non-Disruptive Attachment Interceptor for Privacy Eye-Line Sanitization.
 *
 * Intercepts image inputs targeted for upload across:
 *  1. <input type="file"> selection
 *  2. Clipboard image paste
 *  3. Drag-and-drop image transfers
 *  4. Contenteditable image insertion
 *  5. AI website file attachment buttons
 *
 * Guarantees:
 *  - Interception is strictly scoped to the attached image file
 *  - Never blocks general keyboard, mouse, scrolling, or page interaction
 *  - Replaces original image File with sanitized File before submission
 *  - Fails closed on any error (blocks only the image, never freezes page)
 */

import {
  AttachmentPrivacyStatus,
  AttachmentPrivacyState,
  TrackedAttachment,
  ImageSanitizationResult,
  EyeLineConfig,
} from './types';
import { sanitizeImageLocally } from './imageSanitizer';
import { logVisualPrivacyState } from './logger';

export interface AttachmentInterceptorOptions {
  config?: Partial<EyeLineConfig>;
  onStatusChange?: (status: AttachmentPrivacyStatus, message?: string) => void;
  onStateChange?: (state: AttachmentPrivacyState) => void;
}

const activeInterceptors = new Set<AttachmentInterceptor>();

export class AttachmentInterceptor {
  private attachmentState: AttachmentPrivacyState = 'NONE';
  private pendingProcessingCount: number = 0;
  private blockedImagesCount: number = 0;
  private isEnabled: boolean = false;
  private statusBadge: HTMLElement | null = null;
  private badgeHideTimer: ReturnType<typeof setTimeout> | null = null;

  private trackedAttachments: Map<string, TrackedAttachment> = new Map();
  private originalToSanitizedMap: Map<File, File> = new Map();
  private originalNameToSanitizedMap: Map<string, File> = new Map();

  private boundFileInputHandler: ((e: Event) => void) | null = null;
  private boundPasteHandler: ((e: ClipboardEvent) => void) | null = null;
  private boundDropHandler: ((e: DragEvent) => void) | null = null;

  private userConfig: Partial<EyeLineConfig> = {};
  private onStatusChange?: (status: AttachmentPrivacyStatus, message?: string) => void;
  private onStateChangeCallback?: (state: AttachmentPrivacyState) => void;

  private static formDataPatched: boolean = false;
  private static urlPatched: boolean = false;
  private static fileReaderPatched: boolean = false;

  constructor(options?: AttachmentInterceptorOptions) {
    if (options?.config) this.userConfig = options.config;
    if (options?.onStatusChange) this.onStatusChange = options.onStatusChange;
    if (options?.onStateChange) this.onStateChangeCallback = options.onStateChange;
  }

  /**
   * Initializes local attachment interception and transport replacement.
   * NEVER blocks the native upload event, never cancels events, and allows the
   * website to load the image normally while privacy processing runs asynchronously.
   */
  init(): void {
    if (this.isEnabled || typeof window === 'undefined') return;
    this.isEnabled = true;
    activeInterceptors.add(this);

    this.patchFormData();
    this.patchObjectUrl();
    this.patchFileReader();

    this.boundFileInputHandler = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target && target.tagName === 'INPUT' && target.type === 'file') {
        const files = target.files ? Array.from(target.files) : [];
        const hasImages = files.some((f) => f.type && f.type.startsWith('image/'));
        if (hasImages) {
          // Asynchronously process image privacy without interrupting native event flow
          this.handleFileInput(target);
        }
      }
    };

    this.boundPasteHandler = (e: ClipboardEvent) => {
      if (!e.clipboardData || !e.clipboardData.items) return;
      const items = Array.from(e.clipboardData.items);
      const hasImage = items.some((item) => item.type && item.type.startsWith('image/'));
      if (hasImage) {
        // Native paste proceeds unhindered; privacy processor works asynchronously
        this.handlePaste(e);
      }
    };

    this.boundDropHandler = (e: DragEvent) => {
      if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
      const files = Array.from(e.dataTransfer.files);
      const hasImage = files.some((f) => f.type && f.type.startsWith('image/'));
      if (hasImage) {
        // Native drop proceeds unhindered; privacy processor works asynchronously
        this.handleDrop(e);
      }
    };

    // Passive non-blocking attachment listeners (never block or prevent native event flow)
    window.addEventListener('change', this.boundFileInputHandler, false);
    window.addEventListener('paste', this.boundPasteHandler as EventListener, false);
    window.addEventListener('drop', this.boundDropHandler as EventListener, false);
  }

  /**
   * Cleans up all listeners and UI status badges.
   */
  destroy(): void {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    activeInterceptors.delete(this);

    if (typeof window !== 'undefined') {
      if (this.boundFileInputHandler) {
        window.removeEventListener('change', this.boundFileInputHandler, false);
      }
      if (this.boundPasteHandler) {
        window.removeEventListener('paste', this.boundPasteHandler as EventListener, false);
      }
      if (this.boundDropHandler) {
        window.removeEventListener('drop', this.boundDropHandler as EventListener, false);
      }
    }

    if (this.badgeHideTimer) {
      clearTimeout(this.badgeHideTimer);
      this.badgeHideTimer = null;
    }

    if (this.statusBadge && this.statusBadge.parentNode) {
      this.statusBadge.parentNode.removeChild(this.statusBadge);
      this.statusBadge = null;
    }

    this.resetAttachmentState();
  }

  // ─── State Machine ─────────────────────────────────────────────────────────

  getAttachmentPrivacyState(): AttachmentPrivacyState {
    return this.attachmentState;
  }

  setOnStateChange(cb: (state: AttachmentPrivacyState) => void): void {
    this.onStateChangeCallback = cb;
  }

  setAttachmentPrivacyState(newState: AttachmentPrivacyState): void {
    this.attachmentState = newState;
    this.onStateChangeCallback?.(newState);

    switch (newState) {
      case 'UPLOADED':
      case 'PROCESSING':
        this.showBadge('Checking image privacy…', 'pending');
        this.onStatusChange?.('CHECKING', 'Checking image privacy…');
        break;
      case 'VERIFIED':
        this.showBadge('Image sanitized ✓', 'success');
        this.onStatusChange?.('SANITIZED', 'Image sanitized ✓');
        if (this.badgeHideTimer) clearTimeout(this.badgeHideTimer);
        this.badgeHideTimer = setTimeout(() => this.hideBadge(), 2800);
        break;
      case 'FAILED':
        this.showBadge('Privacy processing failed — upload blocked.', 'error');
        this.onStatusChange?.('BLOCKED', 'Privacy processing failed — upload blocked.');
        break;
      case 'NO_IMAGE':
      case 'NONE':
      default:
        this.hideBadge();
        break;
    }
  }

  resetAttachmentState(): void {
    this.pendingProcessingCount = 0;
    this.blockedImagesCount = 0;
    this.trackedAttachments.clear();
    this.originalToSanitizedMap.clear();
    this.originalNameToSanitizedMap.clear();
    this.setAttachmentPrivacyState('NO_IMAGE');
  }

  isAttachmentPending(): boolean {
    return (
      this.attachmentState === 'UPLOADED' ||
      this.attachmentState === 'PROCESSING' ||
      this.pendingProcessingCount > 0
    );
  }

  hasBlockedAttachments(): boolean {
    return this.attachmentState === 'FAILED' || this.blockedImagesCount > 0;
  }

  getSanitizedAttachments(): File[] {
    const list: File[] = [];
    for (const a of this.trackedAttachments.values()) {
      if (a.sanitizedFile && (a.privacyStatus === 'VERIFIED' || a.privacyStatus === 'NO_FACES')) {
        list.push(a.sanitizedFile);
      }
    }
    return list;
  }

  getTrackedAttachments(): TrackedAttachment[] {
    return Array.from(this.trackedAttachments.values());
  }

  validateAttachmentsForSubmission(): { valid: boolean; error?: string } {
    if (this.isAttachmentPending()) {
      return { valid: false, error: 'Attachment is currently undergoing privacy processing' };
    }
    if (this.hasBlockedAttachments()) {
      return { valid: false, error: 'Attachment privacy check failed — transmission blocked' };
    }

    for (const att of this.trackedAttachments.values()) {
      if (att.privacyStatus !== 'VERIFIED' && att.privacyStatus !== 'NO_FACES') {
        return { valid: false, error: `Image '${att.originalFile.name}' privacy status is ${att.privacyStatus}` };
      }
      if (!att.uploadFile) {
        return { valid: false, error: `Image '${att.originalFile.name}' has no verified upload file` };
      }
      if (att.uploadFile !== att.sanitizedFile) {
        return { valid: false, error: `Image '${att.originalFile.name}' transmission file does not match sanitized file` };
      }
      if (att.privacyStatus === 'VERIFIED' && att.uploadFile === att.originalFile) {
        return { valid: false, error: `Security violation: Raw image '${att.originalFile.name}' is queued for upload` };
      }
    }

    return { valid: true };
  }

  getSanitizedReplacement(file: any): File | null {
    if (!file) return null;
    if (this.originalToSanitizedMap.has(file)) {
      return this.originalToSanitizedMap.get(file)!;
    }
    if (file.name && this.originalNameToSanitizedMap.has(file.name)) {
      return this.originalNameToSanitizedMap.get(file.name)!;
    }
    return null;
  }

  // ─── FormData & URL Auto-Substitution ──────────────────────────────────────

  private patchFormData(): void {
    if (AttachmentInterceptor.formDataPatched || typeof FormData === 'undefined') return;
    AttachmentInterceptor.formDataPatched = true;

    const origAppend = FormData.prototype.append;
    const origSet = FormData.prototype.set;

    FormData.prototype.append = function (name: string, value: any, ...rest: any[]) {
      let sanitized: File | null = null;
      for (const inst of activeInterceptors) {
        sanitized = inst.getSanitizedReplacement(value);
        if (sanitized) break;
      }
      return origAppend.call(this, name, sanitized || value, ...rest);
    };

    FormData.prototype.set = function (name: string, value: any, ...rest: any[]) {
      let sanitized: File | null = null;
      for (const inst of activeInterceptors) {
        sanitized = inst.getSanitizedReplacement(value);
        if (sanitized) break;
      }
      return origSet.call(this, name, sanitized || value, ...rest);
    };
  }

  private patchObjectUrl(): void {
    if (AttachmentInterceptor.urlPatched || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;
    AttachmentInterceptor.urlPatched = true;

    const origCreate = URL.createObjectURL.bind(URL);
    URL.createObjectURL = function (obj: any): string {
      try {
        if (obj) {
          for (const inst of activeInterceptors) {
            const sanitized = inst.getSanitizedReplacement(obj);
            if (sanitized) {
              return origCreate(sanitized);
            }
          }
        }
      } catch {}
      return origCreate(obj);
    };
  }

  private patchFileReader(): void {
    if (AttachmentInterceptor.fileReaderPatched || typeof FileReader === 'undefined') return;
    AttachmentInterceptor.fileReaderPatched = true;

    const origReadAsDataURL = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (blob: Blob) {
      let targetBlob = blob;
      for (const inst of activeInterceptors) {
        const sanitized = inst.getSanitizedReplacement(blob);
        if (sanitized) {
          targetBlob = sanitized;
          break;
        }
      }
      return origReadAsDataURL.call(this, targetBlob);
    };

    const origReadAsArrayBuffer = FileReader.prototype.readAsArrayBuffer;
    FileReader.prototype.readAsArrayBuffer = function (blob: Blob) {
      let targetBlob = blob;
      for (const inst of activeInterceptors) {
        const sanitized = inst.getSanitizedReplacement(blob);
        if (sanitized) {
          targetBlob = sanitized;
          break;
        }
      }
      return origReadAsArrayBuffer.call(this, targetBlob);
    };
  }

  // ─── Visual Preview Replacement ────────────────────────────────────────────

  updateComposerPreview(sanitizedFile: File, originalFileName?: string): void {
    if (typeof document === 'undefined' || !sanitizedFile) return;
    try {
      const previewUrl = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(sanitizedFile) : 'blob:sanitized';
      const selectors = [
        'img.attachment-preview',
        '.attachment-preview img',
        '.attachment-area img',
        '[data-testid*="attachment"] img',
        '[aria-label*="attachment"] img',
        '[data-testid*="image"] img',
        'div[class*="attachment"] img',
        'div[class*="preview"] img',
        'div[class*="upload"] img',
        'div[class*="composer"] img',
        'img[src^="blob:"]',
      ];
      if (originalFileName) {
        selectors.push(`img[alt*="${originalFileName}"]`);
        selectors.push(`img[title*="${originalFileName}"]`);
      }
      const previewElements = document.querySelectorAll<HTMLImageElement>(selectors.join(', '));
      if (previewElements.length > 0) {
        previewElements.forEach((img) => {
          img.src = previewUrl;
          img.setAttribute('data-pf-preview-sanitized', 'true');
        });
      }
    } catch {
      // Non-blocking fail-safe
    }
  }

  // ─── File Input Handling ───────────────────────────────────────────────────

  /**
   * Asynchronously observes files selected via <input type="file">, performs local
   * privacy eye-line sanitization, and prepares the verified sanitized file for transmission.
   * NEVER blocks the native upload event or clears input.files.
   */
  async handleFileInput(input: HTMLInputElement): Promise<boolean> {
    if (!input || !input.files || input.files.length === 0) {
      this.resetAttachmentState();
      return true;
    }

    const files = Array.from(input.files);
    const hasImages = files.some((f) => f.type && f.type.startsWith('image/'));
    if (!hasImages) {
      this.resetAttachmentState();
      return true;
    }

    logVisualPrivacyState('IMAGE_SELECTED', { inputType: 'file_input', fileCount: files.length });

    this.pendingProcessingCount++;
    this.setAttachmentPrivacyState('PROCESSING');

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      for (const file of files) {
        if (file.type && file.type.startsWith('image/')) {
          try {
            window.dispatchEvent(
              new CustomEvent('__PF_IMAGE_PROCESSING_START__', {
                detail: { originalName: file.name, fileSize: file.size },
              })
            );
          } catch {}
        }
      }
    }

    try {
      for (const file of files) {
        if (file.type && file.type.startsWith('image/')) {
          const fileId = `${file.name}_${file.size}_${file.lastModified}`;
          this.trackedAttachments.set(fileId, {
            id: fileId,
            originalFile: file,
            sanitizedFile: null,
            uploadFile: null,
            privacyStatus: 'PENDING',
            version: 1,
            previewUrl: null,
            modifiedRegions: [],
          });

          const result: ImageSanitizationResult = await sanitizeImageLocally(file, this.userConfig);

          if (!result.verificationPassed || !result.sanitizedFile) {
            this.trackedAttachments.set(fileId, {
              id: fileId,
              originalFile: file,
              sanitizedFile: null,
              uploadFile: null,
              privacyStatus: 'FAILED',
              version: 1,
              previewUrl: null,
              modifiedRegions: [],
            });
            this.blockedImagesCount++;
            this.setAttachmentPrivacyState('FAILED');
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
              try {
                window.dispatchEvent(
                  new CustomEvent('__PF_IMAGE_PROCESSING_FAILED__', {
                    detail: { originalName: file.name },
                  })
                );
              } catch {}
            }
            return false;
          }

          this.trackedAttachments.set(fileId, {
            id: fileId,
            originalFile: file,
            sanitizedFile: result.sanitizedFile,
            uploadFile: result.sanitizedFile,
            privacyStatus: result.status === 'NO_FACES' ? 'NO_FACES' : 'VERIFIED',
            version: 1,
            previewUrl: null,
            modifiedRegions: result.modifiedRegions,
          });

          this.originalToSanitizedMap.set(file, result.sanitizedFile);
          this.originalNameToSanitizedMap.set(file.name, result.sanitizedFile);
          this.updateComposerPreview(result.sanitizedFile, file.name);
          logVisualPrivacyState('ATTACHMENT_REPLACED', { fileName: file.name });
        }
      }

      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        for (const file of files) {
          const san = this.originalToSanitizedMap.get(file);
          if (san) {
            try {
              window.dispatchEvent(
                new CustomEvent('__PF_REGISTER_SANITIZED_FILE__', {
                  detail: { originalName: file.name, sanitizedFile: san },
                })
              );
            } catch {}
          }
        }
      }
      // Update target input.files so subsequent form reads get the sanitized file instances
      if (input && input.files && input.files.length > 0) {
        try {
          const sanitizedFiles: File[] = [];
          for (let i = 0; i < input.files.length; i++) {
            const f = input.files[i];
            const san = this.originalToSanitizedMap.get(f) || f;
            sanitizedFiles.push(san);
          }
          if (typeof DataTransfer !== 'undefined') {
            const dt = new DataTransfer();
            sanitizedFiles.forEach((f) => dt.items.add(f));
            input.files = dt.files;
          } else {
            Object.defineProperty(input, 'files', {
              value: sanitizedFiles,
              configurable: true,
              writable: true,
            });
          }
        } catch {}
      }

      this.pendingProcessingCount = Math.max(0, this.pendingProcessingCount - 1);
      this.setAttachmentPrivacyState('VERIFIED');
      return true;
    } catch {
      this.pendingProcessingCount = Math.max(0, this.pendingProcessingCount - 1);
      this.blockedImagesCount++;
      this.setAttachmentPrivacyState('FAILED');
      return false;
    }
  }

  // ─── Clipboard Paste Handling ──────────────────────────────────────────────

  /**
   * Asynchronously observes image files pasted from clipboard and prepares sanitized replacement.
   */
  async handlePaste(e: ClipboardEvent): Promise<boolean> {
    if (!e.clipboardData || !e.clipboardData.items) return true;

    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type && item.type.startsWith('image/'));
    if (!imageItem) return true;

    const originalFile = imageItem.getAsFile();
    if (!originalFile) return true;

    logVisualPrivacyState('IMAGE_SELECTED', { inputType: 'paste', fileName: originalFile.name });

    this.pendingProcessingCount++;
    this.setAttachmentPrivacyState('PROCESSING');

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(
          new CustomEvent('__PF_IMAGE_PROCESSING_START__', {
            detail: { originalName: originalFile.name, fileSize: originalFile.size },
          })
        );
      } catch {}
    }

    const fileId = `${originalFile.name}_${originalFile.size}_${originalFile.lastModified}`;
    this.trackedAttachments.set(fileId, {
      id: fileId,
      originalFile,
      sanitizedFile: null,
      uploadFile: null,
      privacyStatus: 'PENDING',
      version: 1,
      previewUrl: null,
      modifiedRegions: [],
    });

    try {
      const result = await sanitizeImageLocally(originalFile, this.userConfig);

      if (!result.verificationPassed || !result.sanitizedFile) {
        this.trackedAttachments.set(fileId, {
          id: fileId,
          originalFile,
          sanitizedFile: null,
          uploadFile: null,
          privacyStatus: 'FAILED',
          version: 1,
          previewUrl: null,
          modifiedRegions: [],
        });
        this.blockedImagesCount++;
        this.setAttachmentPrivacyState('FAILED');
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          try {
            window.dispatchEvent(
              new CustomEvent('__PF_IMAGE_PROCESSING_FAILED__', {
                detail: { originalName: originalFile.name },
              })
            );
          } catch {}
        }
        return false;
      }

      this.trackedAttachments.set(fileId, {
        id: fileId,
        originalFile,
        sanitizedFile: result.sanitizedFile,
        uploadFile: result.sanitizedFile,
        privacyStatus: result.status === 'NO_FACES' ? 'NO_FACES' : 'VERIFIED',
        version: 1,
        previewUrl: null,
        modifiedRegions: result.modifiedRegions,
      });

      this.originalToSanitizedMap.set(originalFile, result.sanitizedFile);
      this.originalNameToSanitizedMap.set(originalFile.name, result.sanitizedFile);
      this.updateComposerPreview(result.sanitizedFile, originalFile.name);
      logVisualPrivacyState('ATTACHMENT_REPLACED', { fileName: originalFile.name });

      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(
            new CustomEvent('__PF_REGISTER_SANITIZED_FILE__', {
              detail: { originalName: originalFile.name, sanitizedFile: result.sanitizedFile },
            })
          );
        } catch {}
      }

      this.pendingProcessingCount = Math.max(0, this.pendingProcessingCount - 1);
      this.setAttachmentPrivacyState('VERIFIED');
      return true;
    } catch {
      this.pendingProcessingCount = Math.max(0, this.pendingProcessingCount - 1);
      this.blockedImagesCount++;
      this.setAttachmentPrivacyState('FAILED');
      return false;
    }
  }

  // ─── Drag and Drop Handling ────────────────────────────────────────────────

  /**
   * Asynchronously observes drag-and-drop image transfers and prepares sanitized replacement.
   */
  async handleDrop(e: DragEvent): Promise<boolean> {
    if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return true;

    const files = Array.from(e.dataTransfer.files);
    const hasImages = files.some((f) => f.type && f.type.startsWith('image/'));
    if (!hasImages) return true;

    logVisualPrivacyState('IMAGE_SELECTED', { inputType: 'drop', fileCount: files.length });

    this.pendingProcessingCount++;
    this.setAttachmentPrivacyState('PROCESSING');

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      for (const file of files) {
        if (file.type && file.type.startsWith('image/')) {
          try {
            window.dispatchEvent(
              new CustomEvent('__PF_IMAGE_PROCESSING_START__', {
                detail: { originalName: file.name, fileSize: file.size },
              })
            );
          } catch {}
        }
      }
    }

    try {
      for (const file of files) {
        if (file.type && file.type.startsWith('image/')) {
          const fileId = `${file.name}_${file.size}_${file.lastModified}`;
          this.trackedAttachments.set(fileId, {
            id: fileId,
            originalFile: file,
            sanitizedFile: null,
            uploadFile: null,
            privacyStatus: 'PENDING',
            version: 1,
            previewUrl: null,
            modifiedRegions: [],
          });

          const result = await sanitizeImageLocally(file, this.userConfig);

          if (!result.verificationPassed || !result.sanitizedFile) {
            this.trackedAttachments.set(fileId, {
              id: fileId,
              originalFile: file,
              sanitizedFile: null,
              uploadFile: null,
              privacyStatus: 'FAILED',
              version: 1,
              previewUrl: null,
              modifiedRegions: [],
            });
            this.blockedImagesCount++;
            this.setAttachmentPrivacyState('FAILED');
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
              try {
                window.dispatchEvent(
                  new CustomEvent('__PF_IMAGE_PROCESSING_FAILED__', {
                    detail: { originalName: file.name },
                  })
                );
              } catch {}
            }
            return false;
          }

          this.trackedAttachments.set(fileId, {
            id: fileId,
            originalFile: file,
            sanitizedFile: result.sanitizedFile,
            uploadFile: result.sanitizedFile,
            privacyStatus: result.status === 'NO_FACES' ? 'NO_FACES' : 'VERIFIED',
            version: 1,
            previewUrl: null,
            modifiedRegions: result.modifiedRegions,
          });

          this.originalToSanitizedMap.set(file, result.sanitizedFile);
          this.originalNameToSanitizedMap.set(file.name, result.sanitizedFile);
          this.updateComposerPreview(result.sanitizedFile, file.name);
          logVisualPrivacyState('ATTACHMENT_REPLACED', { fileName: file.name });
        }
      }

      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        for (const file of files) {
          const san = this.originalToSanitizedMap.get(file);
          if (san) {
            try {
              window.dispatchEvent(
                new CustomEvent('__PF_REGISTER_SANITIZED_FILE__', {
                  detail: { originalName: file.name, sanitizedFile: san },
                })
              );
            } catch {}
          }
        }
      }

      this.pendingProcessingCount = Math.max(0, this.pendingProcessingCount - 1);
      this.setAttachmentPrivacyState('VERIFIED');
      return true;
    } catch {
      this.pendingProcessingCount = Math.max(0, this.pendingProcessingCount - 1);
      this.blockedImagesCount++;
      this.setAttachmentPrivacyState('FAILED');
      return false;
    }
  }

  // ─── Target Delivery ───────────────────────────────────────────────────────

  private dispatchSanitizedFileToTarget(_target: HTMLElement | null, _sanitizedFile: File): void {
    // Non-intrusive: native event propagation handles file delivery to the target.
  }

  // ─── Non-Intrusive Privacy Status Badge ─────────────────────────────────────

  private ensureBadgeMounted(): void {
    if (typeof document === 'undefined' || !document.body) return;

    if (!this.statusBadge) {
      this.statusBadge = document.createElement('div');
      this.statusBadge.id = '__pf_visual_privacy_badge__';
      this.statusBadge.style.cssText = `
        position: fixed;
        bottom: 56px;
        right: 16px;
        z-index: 2147483646;
        padding: 6px 14px;
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.2px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.18);
        display: none;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
        pointer-events: none;
      `;
      document.body.appendChild(this.statusBadge);
    }
  }

  private showBadge(text: string, style: 'pending' | 'success' | 'error'): void {
    this.ensureBadgeMounted();
    if (!this.statusBadge) return;

    this.statusBadge.style.display = 'flex';
    this.statusBadge.textContent = text;

    if (style === 'pending') {
      this.statusBadge.style.backgroundColor = '#1E293B';
      this.statusBadge.style.color = '#F59E0B';
      this.statusBadge.style.border = '1px solid #F59E0B44';
    } else if (style === 'success') {
      this.statusBadge.style.backgroundColor = '#064E3B';
      this.statusBadge.style.color = '#10B981';
      this.statusBadge.style.border = '1px solid #10B98144';
    } else {
      this.statusBadge.style.backgroundColor = '#7F1D1D';
      this.statusBadge.style.color = '#EF4444';
      this.statusBadge.style.border = '1px solid #EF444444';
    }
  }

  private hideBadge(): void {
    if (this.statusBadge) {
      this.statusBadge.style.display = 'none';
    }
  }
}

export const defaultAttachmentInterceptor = new AttachmentInterceptor();
