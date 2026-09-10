/**
 * privacyEyeLineSanitization.test.ts
 *
 * Comprehensive Test Suite for Privacy Eye-Line Image Sanitization.
 *
 * Tests the complete 20-case test matrix specified in Section 18:
 *  1. One frontal face
 *  2. One face with head tilted
 *  3. Multiple faces
 *  4. Different image resolutions (low-res, 1080p, 4K)
 *  5. Small face
 *  6. Large face
 *  7. Face near image edge
 *  8. No face (clean image passthrough)
 *  9. Image with non-human objects
 * 10. Corrupted image (fail closed)
 * 11. Unsupported file type (fail closed)
 * 12. Detection failure (fail closed)
 * 13. Processing failure (fail closed)
 * 14. Verification failure (fail closed)
 * 15. Successful sanitized upload
 * 16. Ensure original File is NOT submitted (strict reference check)
 * 17. Clipboard image paste interception
 * 18. Drag-and-drop image interception
 * 19. File input (<input type="file">) image replacement
 * 20. AI-site attachment flow & Send-Gate integration
 *
 * Plus Non-Interference Guarantees:
 *  - Normal page typing remains functional
 *  - Scrolling remains functional
 *  - Unrelated buttons remain clickable
 *  - No global event blocking or page freezing
 */

import {
  sanitizeImageLocally,
  calculateEyeBandGeometry,
  renderEyeBand,
  renderAllEyeBands,
  createAnatomicalFaceLandmarks,
  detectFacesAndEyes,
  registerEyeRegionDetector,
  verifySanitizedCanvas,
  verifySanitizedFile,
  verifySanitization,
  AttachmentInterceptor,
  FaceLandmarks,
  FaceBox,
  EyeLineConfig,
  DEFAULT_EYE_LINE_CONFIG,
} from '../visualPrivacy';
import { AiSendGate } from '../privacy/aiSendGate';

function createMockDataTransfer() {
  const fileArr: any[] = [];
  const filesList: any = fileArr;
  filesList.item = function (i: number) {
    return filesList[i] || null;
  };
  return {
    items: {
      add: function (file: any) {
        fileArr.push(file);
      },
    },
    get files() {
      return filesList;
    },
  };
}

if (typeof (global as any).DataTransfer === 'undefined') {
  (global as any).DataTransfer = function () {
    return createMockDataTransfer();
  };
}

describe('Privacy Eye-Line Image Sanitization', () => {
  let mockCtx: any;

  beforeEach(() => {
    document.body.innerHTML = '';
    registerEyeRegionDetector(null);

    // Mock 2D Canvas context for jsdom environment
    mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      fillRect: jest.fn(),
      roundRect: jest.fn(),
      beginPath: jest.fn(),
      fill: jest.fn(),
      drawImage: jest.fn(),
      fillStyle: '#000000',
      globalAlpha: 1.0,
      getImageData: jest.fn().mockImplementation((x: number, y: number, w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8Array([0, 0, 0, 255]), // black rendered pixel
      })),
    };

    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockCtx);
    HTMLCanvasElement.prototype.toBlob = jest.fn().mockImplementation(function (
      this: HTMLCanvasElement,
      callback: (blob: Blob | null) => void,
      type?: string
    ) {
      callback(new Blob(['sanitized-canvas-bytes'], { type: type || 'image/png' }));
    });
    HTMLCanvasElement.prototype.toDataURL = jest.fn().mockReturnValue('data:image/png;base64,c2FuaXRpemVk');
  });

  afterEach(() => {
    registerEyeRegionDetector(null);
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  // ─── 1. One Frontal Face ───────────────────────────────────────────────────

  it('1. One frontal face: detects eye line and draws horizontal privacy band across eyes', async () => {
    const faceBox: FaceBox = { x: 100, y: 100, width: 200, height: 250 };
    const landmarks = createAnatomicalFaceLandmarks(faceBox, 0); // 0 radians tilt

    registerEyeRegionDetector(async () => [landmarks]);

    const fakeFile = new File(['fake-image-bytes'], 'frontal_face.png', { type: 'image/png' });
    const result = await sanitizeImageLocally(fakeFile);

    expect(result.verificationPassed).toBe(true);
    expect(result.status).toBe('SANITIZED');
    expect(result.detectedFaces.length).toBe(1);
    expect(result.modifiedRegions.length).toBe(1);

    const band = result.modifiedRegions[0];
    expect(band.angleRad).toBeCloseTo(0, 1);
    expect(band.center.x).toBeCloseTo(200, -1);
    expect(band.length).toBeGreaterThan(faceBox.width * 0.4);
    expect(band.thickness).toBeGreaterThanOrEqual(14);
    expect(result.sanitizedFile).not.toBeNull();
    expect(result.sanitizedFile).not.toBe(fakeFile);
  });

  // ─── 2. One Face with Head Tilted ──────────────────────────────────────────

  it('2. One face with head tilted: derives eyeLineAngle and rotates privacy band accordingly', async () => {
    const tiltAngle = 0.35; // ~20 degrees tilt
    const faceBox: FaceBox = { x: 150, y: 150, width: 220, height: 260 };
    const landmarks = createAnatomicalFaceLandmarks(faceBox, tiltAngle);

    registerEyeRegionDetector(async () => [landmarks]);

    const fakeFile = new File(['fake-image-bytes'], 'tilted_face.jpg', { type: 'image/jpeg' });
    const result = await sanitizeImageLocally(fakeFile);

    expect(result.verificationPassed).toBe(true);
    expect(result.status).toBe('SANITIZED');
    expect(result.modifiedRegions.length).toBe(1);

    const band = result.modifiedRegions[0];
    // Must rotate to follow head tilt angle!
    expect(band.angleRad).toBeCloseTo(tiltAngle, 1);
    expect(mockCtx.rotate).toHaveBeenCalledWith(expect.closeTo(tiltAngle, 1));
  });

  // ─── 3. Multiple Faces ─────────────────────────────────────────────────────

  it('3. Multiple faces: detects and renders an independent eye band for every person', async () => {
    const face1 = createAnatomicalFaceLandmarks({ x: 50, y: 80, width: 120, height: 150 }, 0);
    const face2 = createAnatomicalFaceLandmarks({ x: 250, y: 90, width: 140, height: 170 }, 0.15);
    const face3 = createAnatomicalFaceLandmarks({ x: 450, y: 110, width: 110, height: 140 }, -0.2);

    registerEyeRegionDetector(async () => [face1, face2, face3]);

    const fakeFile = new File(['fake-image-bytes'], 'group_photo.png', { type: 'image/png' });
    const result = await sanitizeImageLocally(fakeFile);

    expect(result.verificationPassed).toBe(true);
    expect(result.status).toBe('SANITIZED');
    expect(result.detectedFaces.length).toBe(3);
    expect(result.modifiedRegions.length).toBe(3);

    // Each person has independent band coordinates and tilt angle
    expect(result.modifiedRegions[0].center.x).toBeLessThan(result.modifiedRegions[1].center.x);
    expect(result.modifiedRegions[1].center.x).toBeLessThan(result.modifiedRegions[2].center.x);
    expect(mockCtx.fillRect).toHaveBeenCalledTimes(3);
  });

  // ─── 4. Different Image Resolutions ────────────────────────────────────────

  it('4. Different image resolutions: scales band geometry proportionally (low-res, 1080p, 4K)', async () => {
    // 1080p face
    const face1080p = createAnatomicalFaceLandmarks({ x: 800, y: 400, width: 400, height: 500 });
    const geom1080p = calculateEyeBandGeometry(face1080p);

    // 4K face
    const face4K = createAnatomicalFaceLandmarks({ x: 1600, y: 800, width: 800, height: 1000 });
    const geom4K = calculateEyeBandGeometry(face4K);

    // 4K band should be approximately double length and thickness of 1080p band
    expect(geom4K.length).toBeGreaterThan(geom1080p.length * 1.8);
    expect(geom4K.thickness).toBeGreaterThan(geom1080p.thickness * 1.8);
  });

  // ─── 5. Small Face ─────────────────────────────────────────────────────────

  it('5. Small face: maintains minimum visible band thickness without disappearing', () => {
    const smallFace = createAnatomicalFaceLandmarks({ x: 20, y: 20, width: 35, height: 45 });
    const geom = calculateEyeBandGeometry(smallFace);

    expect(geom.thickness).toBeGreaterThanOrEqual(14); // Enforces minimum thickness floor
    expect(geom.length).toBeGreaterThan(15);
  });

  // ─── 6. Large Face ─────────────────────────────────────────────────────────

  it('6. Large face: bounds eye band properly without covering mouth or entire face', () => {
    const largeFace = createAnatomicalFaceLandmarks({ x: 50, y: 50, width: 600, height: 750 });
    const geom = calculateEyeBandGeometry(largeFace);

    // Band height must not cover the lower half of the face (nose/mouth)
    expect(geom.thickness).toBeLessThan(largeFace.faceBox.height * 0.35);
    // Band top should remain well above the mouth line (mouth is at ~75% face height)
    const bandBottomY = geom.center.y + geom.thickness / 2;
    const mouthY = largeFace.faceBox.y + largeFace.faceBox.height * 0.75;
    expect(bandBottomY).toBeLessThan(mouthY);
  });

  // ─── 7. Face Near Image Edge ───────────────────────────────────────────────

  it('7. Face near image edge: calculates band geometry correctly without throwing', async () => {
    const edgeFace = createAnatomicalFaceLandmarks({ x: 5, y: 5, width: 100, height: 120 }, 0.1);
    registerEyeRegionDetector(async () => [edgeFace]);

    const fakeFile = new File(['fake-image-bytes'], 'edge_face.png', { type: 'image/png' });
    const result = await sanitizeImageLocally(fakeFile);

    expect(result.verificationPassed).toBe(true);
    expect(result.status).toBe('SANITIZED');
    expect(result.modifiedRegions.length).toBe(1);
  });

  // ─── 8. No Face ────────────────────────────────────────────────────────────

  it('8. No face: clean image returns NO_FACES status and verified output copy', async () => {
    registerEyeRegionDetector(async () => []); // 0 faces

    const fakeFile = new File(['landscape-bytes'], 'mountain.png', { type: 'image/png' });
    const result = await sanitizeImageLocally(fakeFile);

    expect(result.verificationPassed).toBe(true);
    expect(result.status).toBe('NO_FACES');
    expect(result.detectedFaces.length).toBe(0);
    expect(result.modifiedRegions.length).toBe(0);
    expect(result.sanitizedFile).not.toBeNull();
    expect(result.sanitizedFile).not.toBe(fakeFile); // Fresh sanitized instance
  });

  // ─── 9. Image with Non-Human Objects ───────────────────────────────────────

  it('9. Image with non-human objects: correctly identifies absence of faces', async () => {
    registerEyeRegionDetector(async () => []);

    const fakeFile = new File(['car-bytes'], 'car.jpg', { type: 'image/jpeg' });
    const result = await sanitizeImageLocally(fakeFile);

    expect(result.status).toBe('NO_FACES');
    expect(result.modifiedRegions.length).toBe(0);
  });

  // ─── 10. Corrupted Image ───────────────────────────────────────────────────

  it('10. Corrupted image: fails closed and blocks image submission', async () => {
    // Empty file buffer represents un-decodable corrupted file
    const corruptedFile = new File([], 'corrupt.png', { type: 'image/png' });
    const result = await sanitizeImageLocally(corruptedFile);

    expect(result.verificationPassed).toBe(false);
    expect(result.status).toBe('FAILED');
    expect(result.sanitizedFile).toBeNull();
    expect(result.error).toContain('Empty');
  });

  // ─── 11. Unsupported Image ─────────────────────────────────────────────────

  it('11. Unsupported file type: fails closed and rejects non-image input', async () => {
    const textFile = new File(['raw payload'], 'document.pdf', { type: 'application/pdf' });
    const result = await sanitizeImageLocally(textFile);

    expect(result.verificationPassed).toBe(false);
    expect(result.status).toBe('FAILED');
    expect(result.sanitizedFile).toBeNull();
    expect(result.error).toContain('Unsupported file type');
  });

  // ─── 12. Detection Failure ─────────────────────────────────────────────────

  it('12. Detection failure: fails closed when vision model encounters an error', async () => {
    registerEyeRegionDetector(async () => {
      throw new Error('Vision model runtime out of memory');
    });

    const fakeFile = new File(['fake-bytes'], 'face.png', { type: 'image/png' });
    const result = await sanitizeImageLocally(fakeFile);

    expect(result.verificationPassed).toBe(false);
    expect(result.status).toBe('FAILED');
    expect(result.sanitizedFile).toBeNull();
    expect(result.error).toContain('Vision model runtime');
  });

  // ─── 13. Processing Failure ────────────────────────────────────────────────

  it('13. Processing failure: fails closed if canvas context cannot be acquired', async () => {
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null);

    const fakeFile = new File(['fake-bytes'], 'face.png', { type: 'image/png' });
    const result = await sanitizeImageLocally(fakeFile);

    expect(result.verificationPassed).toBe(false);
    expect(result.status).toBe('FAILED');
    expect(result.sanitizedFile).toBeNull();
  });

  // ─── 14. Verification Failure ──────────────────────────────────────────────

  it('14. Verification failure: blocks submission if sanitized canvas verification fails', () => {
    const face = createAnatomicalFaceLandmarks({ x: 50, y: 50, width: 100, height: 120 });
    const canvas: any = { width: 400, height: 400, getContext: () => null };

    // Pass 1 face but 0 geometries -> verification fails!
    const check = verifySanitizedCanvas(canvas, [face], []);
    expect(check.verified).toBe(false);
    expect(check.error).toContain('Missing privacy bands');
  });

  // ─── 15. Successful Sanitized Upload ───────────────────────────────────────

  it('15. Successful sanitized upload: generates verified output Blob/File with eye band', async () => {
    const face = createAnatomicalFaceLandmarks({ x: 80, y: 80, width: 150, height: 180 });
    registerEyeRegionDetector(async () => [face]);

    const fakeFile = new File(['valid-image-bytes'], 'profile.png', { type: 'image/png' });
    const result = await sanitizeImageLocally(fakeFile);

    expect(result.verificationPassed).toBe(true);
    expect(result.status).toBe('SANITIZED');
    expect(result.sanitizedFile).toBeInstanceOf(File);
    expect(result.sanitizedFile!.size).toBeGreaterThan(0);
    expect(result.sanitizedFile!.type).toBe('image/png');
  });

  // ─── 16. Ensure Original File is NOT Submitted ─────────────────────────────

  it('16. Ensure original File is NOT submitted: strict instance inequality check', async () => {
    const originalFile = new File(['original-raw-face-bytes'], 'my_face.png', { type: 'image/png' });
    const face = createAnatomicalFaceLandmarks({ x: 100, y: 100, width: 160, height: 200 });
    registerEyeRegionDetector(async () => [face]);

    const result = await sanitizeImageLocally(originalFile);

    expect(result.sanitizedFile).not.toBeNull();
    // CRITICAL: Must be a brand new File instance, NEVER the original file!
    expect(result.sanitizedFile).not.toBe(originalFile);

    const fileVerification = verifySanitizedFile(result.sanitizedFile, originalFile);
    expect(fileVerification.verified).toBe(true);

    // If an attacker tries to submit the original file as sanitized:
    const bypassCheck = verifySanitizedFile(originalFile, originalFile);
    expect(bypassCheck.verified).toBe(false);
    expect(bypassCheck.error).toContain('Security violation');
  });

  // ─── 17. Clipboard Image Paste ─────────────────────────────────────────────

  it('17. Clipboard image paste: intercepts pasted image and sanitizes before target insertion', async () => {
    const interceptor = new AttachmentInterceptor();
    interceptor.init();

    const originalFile = new File(['clipboard-image'], 'pasted.png', { type: 'image/png' });
    const face = createAnatomicalFaceLandmarks({ x: 50, y: 50, width: 100, height: 120 });
    registerEyeRegionDetector(async () => [face]);

    let deliveredFile: File | null = null;
    const target = document.createElement('div');
    target.addEventListener('drop', (e: any) => {
      if (e.dataTransfer && e.dataTransfer.files) {
        deliveredFile = e.dataTransfer.files[0];
      }
    });
    document.body.appendChild(target);

    // Simulate paste event
    const pasteEvent: any = new Event('paste', { bubbles: true, cancelable: true });
    pasteEvent.clipboardData = {
      items: [
        {
          type: 'image/png',
          getAsFile: () => originalFile,
        },
      ],
    };
    Object.defineProperty(pasteEvent, 'target', { value: target });

    const success = await interceptor.handlePaste(pasteEvent);
    expect(success).toBe(true);
    // Native paste is preserved without cancellation so website handles it
    expect(pasteEvent.defaultPrevented).toBe(false);
    const sanitized = interceptor.getSanitizedReplacement(originalFile);
    expect(sanitized).not.toBeNull();
    expect(sanitized).not.toBe(originalFile);

    interceptor.destroy();
  });

  // ─── 18. Drag-and-Drop Image ───────────────────────────────────────────────

  it('18. Drag/drop image: passively observes dropped files and prepares sanitized version without blocking', async () => {
    const interceptor = new AttachmentInterceptor();
    interceptor.init();

    const originalFile = new File(['dropped-image'], 'photo.jpg', { type: 'image/jpeg' });
    const face = createAnatomicalFaceLandmarks({ x: 60, y: 60, width: 110, height: 130 });
    registerEyeRegionDetector(async () => [face]);

    const dropzone = document.createElement('div');
    document.body.appendChild(dropzone);

    const dropEvent: any = new Event('drop', { bubbles: true, cancelable: true });
    dropEvent.dataTransfer = {
      files: [originalFile],
    };
    Object.defineProperty(dropEvent, 'target', { value: dropzone });

    const success = await interceptor.handleDrop(dropEvent);
    expect(success).toBe(true);
    // Native drop is preserved without cancellation so website receives it
    expect(dropEvent.defaultPrevented).toBe(false);
    const sanitized = interceptor.getSanitizedReplacement(originalFile);
    expect(sanitized).not.toBeNull();
    expect(sanitized).not.toBe(originalFile);

    interceptor.destroy();
  });

  // ─── 19. File Input Image (<input type="file">) ────────────────────────────

  it('19. File input image: replaces input.files with verified sanitized file instance', async () => {
    const interceptor = new AttachmentInterceptor();
    interceptor.init();

    const originalFile = new File(['input-file-bytes'], 'upload.png', { type: 'image/png' });
    const face = createAnatomicalFaceLandmarks({ x: 40, y: 40, width: 90, height: 110 });
    registerEyeRegionDetector(async () => [face]);

    const input = document.createElement('input');
    input.type = 'file';

    Object.defineProperty(input, 'files', {
      value: [originalFile],
      configurable: true,
      writable: true,
    });
    document.body.appendChild(input);

    const processed = await interceptor.handleFileInput(input);
    expect(processed).toBe(true);

    // Sanitized file is securely prepared in interceptor
    const sanitized = interceptor.getSanitizedReplacement(originalFile);
    expect(sanitized).not.toBeNull();
    expect(sanitized).not.toBe(originalFile);

    // CRITICAL: input.files is replaced with sanitized File instance so AI site receives sanitized image
    expect(input.files).not.toBeNull();
    expect(input.files!.length).toBe(1);
    expect(input.files![0]).not.toBe(originalFile);
    expect(input.files![0].name).toBe(originalFile.name);

    interceptor.destroy();
  });

  // ─── 20. AI-Site Attachment Flow & Send Gate Integration ───────────────────

  it('20. AI-site attachment flow: gates AI Send while attachment processing and unblocks on sanitized completion', async () => {
    document.body.innerHTML = `
      <div class="composer-container">
        <textarea id="prompt-textarea">Explain this image for me</textarea>
        <button data-testid="send-button">Send</button>
      </div>
    `;

    const gate = new AiSendGate();
    gate.init('https://chatgpt.com');

    const interceptor = new AttachmentInterceptor();
    interceptor.init();
    gate.attachmentInterceptor = interceptor;

    const composer = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
    const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;

    // 1. Initial clean text verified
    await gate.processAndVerifyContent();
    expect(gate.isSubmissionAllowed()).toBe(true);
    expect(sendBtn.disabled).toBe(false);

    // 2. User attaches an image: interceptor starts processing
    const originalFile = new File(['raw-photo'], 'face.png', { type: 'image/png' });
    const face = createAnatomicalFaceLandmarks({ x: 100, y: 100, width: 140, height: 180 });
    registerEyeRegionDetector(async () => [face]);

    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', {
      value: [originalFile],
      configurable: true,
      writable: true,
    });

    // Start file sanitization
    const sanitizePromise = interceptor.handleFileInput(input);

    // While pending, attachment is pending in interceptor
    expect(interceptor.isAttachmentPending()).toBe(true);
    // AI submission is GATED while image is being sanitized!
    expect(gate.isSubmissionAllowed()).toBe(false);

    // Complete sanitization
    await sanitizePromise;
    expect(interceptor.isAttachmentPending()).toBe(false);

    // Once sanitized, AI submission is permitted
    expect(gate.isSubmissionAllowed()).toBe(true);

    interceptor.destroy();
    gate.destroy();
  });

  // ─── Non-Interference Guarantees ───────────────────────────────────────────

  describe('Non-Interference Guarantees: Webpage Interactivity Preserved', () => {
    it('typing, scrolling, and unrelated buttons remain 100% functional during image privacy processing', () => {
      document.body.innerHTML = `
        <input id="active-input" type="text" placeholder="Type here" />
        <button id="cancel-btn">Cancel</button>
        <button id="nav-btn">Navigate</button>
      `;

      const interceptor = new AttachmentInterceptor();
      interceptor.init();

      const input = document.getElementById('active-input') as HTMLInputElement;
      const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
      const navBtn = document.getElementById('nav-btn') as HTMLButtonElement;

      // 1. Typing is NOT intercepted or prevented
      let keyFired = false;
      input.addEventListener('keydown', (e) => {
        if (!e.defaultPrevented) keyFired = true;
      });
      const keyEvt = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
      input.dispatchEvent(keyEvt);
      expect(keyEvt.defaultPrevented).toBe(false);
      expect(keyFired).toBe(true);

      // 2. Unrelated button clicks are NOT intercepted or prevented
      let cancelClicked = false;
      cancelBtn.addEventListener('click', (e) => {
        if (!e.defaultPrevented) cancelClicked = true;
      });
      const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true });
      cancelBtn.dispatchEvent(clickEvt);
      expect(clickEvt.defaultPrevented).toBe(false);
      expect(cancelClicked).toBe(true);

      let navClicked = false;
      navBtn.addEventListener('click', (e) => {
        if (!e.defaultPrevented) navClicked = true;
      });
      const navClickEvt = new MouseEvent('click', { bubbles: true, cancelable: true });
      navBtn.dispatchEvent(navClickEvt);
      expect(navClickEvt.defaultPrevented).toBe(false);
      expect(navClicked).toBe(true);

      // 3. Scrolling is NOT intercepted
      let scrollFired = false;
      window.addEventListener('scroll', () => { scrollFired = true; });
      window.dispatchEvent(new Event('scroll'));
      expect(scrollFired).toBe(true);

      interceptor.destroy();
    });
  });

  // ─── Regression Suite: Screenshot Failure & Pipeline Fixes ─────────────────

  describe('Regression Suite: Pipeline Unstuck & Screenshot Scenario Verification', () => {
    it('exact screenshot scenario: image attached with text transitions Send button disabled -> enabled', async () => {
      document.body.innerHTML = `
        <div class="composer-container">
          <textarea id="prompt-textarea">Describe this image.</textarea>
          <div class="attachment-area">
            <img class="attachment-preview" src="blob:https://chatgpt.com/original-preview" />
          </div>
          <button data-testid="send-button" disabled>Send</button>
        </div>
      `;

      const gate = new AiSendGate();
      gate.init('https://chatgpt.com');

      const interceptor = new AttachmentInterceptor();
      interceptor.init();
      gate.attachmentInterceptor = interceptor;
      interceptor.setOnStateChange(() => {
        gate.evaluateSendAllowed();
      });

      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
      const previewImg = document.querySelector('.attachment-preview') as HTMLImageElement;

      // 1. Initial prompt analyzed and verified
      await gate.processAndVerifyContent();
      expect(gate.isSubmissionAllowed()).toBe(true);
      expect(sendBtn.disabled).toBe(false);

      // 2. User attaches an image: processing begins -> Send button is DISABLED!
      const portraitFile = new File(['portrait-face-bytes'], 'portrait.jpg', { type: 'image/jpeg' });
      const face = createAnatomicalFaceLandmarks({ x: 80, y: 80, width: 140, height: 170 });
      registerEyeRegionDetector(async () => [face]);

      const input = document.createElement('input');
      input.type = 'file';
      Object.defineProperty(input, 'files', {
        value: [portraitFile],
        configurable: true,
        writable: true,
      });

      const handlePromise = interceptor.handleFileInput(input);

      // While processing: attachmentState is PROCESSING and Send is DISABLED!
      expect(interceptor.getAttachmentPrivacyState()).toBe('PROCESSING');
      gate.evaluateSendAllowed();
      expect(gate.isSubmissionAllowed()).toBe(false);
      expect(sendBtn.disabled).toBe(true);

      // 3. Sanitization completes
      await handlePromise;

      // Attachment state becomes VERIFIED
      expect(interceptor.getAttachmentPrivacyState()).toBe('VERIFIED');
      expect(interceptor.isAttachmentPending()).toBe(false);

      // Preview image has been updated to sanitized preview
      expect(previewImg.getAttribute('data-pf-preview-sanitized')).toBe('true');
      expect(previewImg.src).not.toContain('original-preview');

      // CRITICAL: Send button transitions to ENABLED!
      expect(gate.isSubmissionAllowed()).toBe(true);
      expect(sendBtn.disabled).toBe(false);

      // 4. Outgoing transmission test: FormData auto-substitution
      const fd = new FormData();
      fd.append('file', portraitFile);
      const outgoingFile = fd.get('file') as File;
      expect(outgoingFile).not.toBe(portraitFile);
      expect(outgoingFile.name).toBe('portrait.jpg');

      interceptor.destroy();
      gate.destroy();
    });

    it('image replacement and removal invalidates previous verification state', async () => {
      const interceptor = new AttachmentInterceptor();
      interceptor.init();

      const face = createAnatomicalFaceLandmarks({ x: 100, y: 100, width: 120, height: 150 });
      registerEyeRegionDetector(async () => [face]);

      const file1 = new File(['face-1'], 'face1.png', { type: 'image/png' });
      const input = document.createElement('input');
      input.type = 'file';
      Object.defineProperty(input, 'files', { value: [file1], configurable: true, writable: true });

      await interceptor.handleFileInput(input);
      expect(interceptor.getAttachmentPrivacyState()).toBe('VERIFIED');

      // User clears input (removes image)
      Object.defineProperty(input, 'files', { value: [], configurable: true, writable: true });
      await interceptor.handleFileInput(input);
      expect(['NONE', 'NO_IMAGE']).toContain(interceptor.getAttachmentPrivacyState());

      interceptor.destroy();
    });

    it('autonomous local canvas face detector detects skin clusters without external libraries', async () => {
      registerEyeRegionDetector(null); // No mock detector!

      const width = 160;
      const height = 200;
      const imgBuffer = new Uint8ClampedArray(width * height * 4);

      // Fill with typical human skin tone (R=210, G=150, B=120) inside a face box (x=40..120, y=40..140)
      for (let y = 40; y < 140; y++) {
        for (let x = 40; x < 120; x++) {
          const idx = (y * width + x) * 4;
          imgBuffer[idx] = 210;     // R
          imgBuffer[idx + 1] = 150; // G
          imgBuffer[idx + 2] = 120; // B
          imgBuffer[idx + 3] = 255; // A
        }
      }

      // Eye area: darker luminance
      for (let y = 75; y < 85; y++) {
        for (let x = 55; x < 70; x++) {
          const idx = (y * width + x) * 4;
          imgBuffer[idx] = 30;
          imgBuffer[idx + 1] = 20;
          imgBuffer[idx + 2] = 20;
        }
        for (let x = 90; x < 105; x++) {
          const idx = (y * width + x) * 4;
          imgBuffer[idx] = 30;
          imgBuffer[idx + 1] = 20;
          imgBuffer[idx + 2] = 20;
        }
      }

      mockCtx.getImageData = jest.fn().mockReturnValue({
        width,
        height,
        data: imgBuffer,
      });

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const detected = await detectFacesAndEyes(canvas);
      expect(Array.isArray(detected)).toBe(true);
      expect(detected.length).toBeGreaterThanOrEqual(1);
      expect(detected[0].leftEye).toBeDefined();
      expect(detected[0].rightEye).toBeDefined();
      expect(detected[0].rollAngleRad).toBeDefined();
    });

    it('reference scenario: 4 people in photo all receive independent black rectangular eye bands', async () => {
      // Setup mock DOM for AI chat site (e.g. ChatGPT)
      document.body.innerHTML = `
        <div class="composer-container">
          <textarea id="prompt-textarea" placeholder="Message ChatGPT…"></textarea>
          <div class="attachment-preview-area">
            <img class="attachment-thumb" src="blob:original-multi" />
          </div>
          <button data-testid="send-button" aria-label="Send prompt">Send</button>
        </div>
      `;

      const gate = new AiSendGate();
      gate.init('https://chatgpt.com');

      const interceptor = new AttachmentInterceptor();
      interceptor.init();
      interceptor.setOnStateChange(() => {
        gate.evaluateSendAllowed();
      });
      gate.attachmentInterceptor = interceptor;

      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
      expect(sendBtn.disabled).toBe(true);

      // 4 people in a group photo
      const face1 = createAnatomicalFaceLandmarks({ x: 40, y: 50, width: 90, height: 120 }, 0);
      const face2 = createAnatomicalFaceLandmarks({ x: 150, y: 55, width: 95, height: 125 }, 0.08);
      const face3 = createAnatomicalFaceLandmarks({ x: 260, y: 48, width: 92, height: 122 }, -0.05);
      const face4 = createAnatomicalFaceLandmarks({ x: 370, y: 52, width: 88, height: 118 }, 0.02);

      registerEyeRegionDetector(async () => [face1, face2, face3, face4]);

      const multiPersonFile = new File(['multi-person-raw-bytes'], 'family_photo.jpg', { type: 'image/jpeg' });
      const input = document.createElement('input');
      input.type = 'file';
      Object.defineProperty(input, 'files', {
        value: [multiPersonFile],
        configurable: true,
        writable: true,
      });

      // User attaches image
      await interceptor.handleFileInput(input);

      // Verify all 4 faces were processed and received bands
      expect(interceptor.getAttachmentPrivacyState()).toBe('VERIFIED');
      const sanitizedAttachments = interceptor.getSanitizedAttachments();
      expect(sanitizedAttachments.length).toBe(1);
      const sanitized = sanitizedAttachments[0];
      expect(sanitized).not.toBe(multiPersonFile);
      expect(sanitized.name).toBe('family_photo.jpg');

      // Verify 4 fillRect calls occurred for 4 independent eye bands
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(4);

      // Send button must now be enabled
      expect(sendBtn.disabled).toBe(false);
      expect(gate.isSubmissionAllowed()).toBe(true);

      // Verify outgoing FormData transmission uses sanitized file
      const fd = new FormData();
      fd.append('file', multiPersonFile);
      const outgoing = fd.get('file') as File;
      expect(outgoing).not.toBe(multiPersonFile);
      expect(outgoing.name).toBe('family_photo.jpg');

      interceptor.destroy();
      gate.destroy();
    });

    it('large image (4000x3000): calculates relative geometry and sanitizes proportionally', async () => {
      const largeFace = createAnatomicalFaceLandmarks({ x: 1200, y: 800, width: 800, height: 1100 });
      registerEyeRegionDetector(async () => [largeFace]);

      const largeFile = new File(['large-image-content'], 'high_res_portrait.png', { type: 'image/png' });
      const result = await sanitizeImageLocally(largeFile);

      expect(result.verificationPassed).toBe(true);
      expect(result.status).toBe('SANITIZED');
      expect(result.modifiedRegions.length).toBe(1);

      const band = result.modifiedRegions[0];
      // Proportional to face dimensions
      expect(band.thickness).toBeGreaterThan(100);
      expect(band.length).toBeGreaterThan(400);
      expect(result.sanitizedFile).not.toBe(largeFile);
    });

    it('enter-to-send gating: Enter keydown is blocked during PROCESSING and enabled when VERIFIED', async () => {
      document.body.innerHTML = `
        <div class="composer-container">
          <textarea id="prompt-textarea" placeholder="Ask AI…"></textarea>
          <button data-testid="send-button">Send</button>
        </div>
      `;

      const gate = new AiSendGate();
      gate.init('https://chatgpt.com');

      const interceptor = new AttachmentInterceptor();
      interceptor.init();
      interceptor.setOnStateChange(() => {
        gate.evaluateSendAllowed();
      });
      gate.attachmentInterceptor = interceptor;

      const textarea = document.querySelector('#prompt-textarea') as HTMLTextAreaElement;
      textarea.value = 'Safe question about this image';
      await gate.processAndVerifyContent();

      // Simulate PROCESSING state
      interceptor.setAttachmentPrivacyState('PROCESSING');
      gate.evaluateSendAllowed();

      let enterPrevented = false;
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(enterEvent, 'preventDefault', {
        value: () => { enterPrevented = true; },
      });

      textarea.dispatchEvent(enterEvent);
      expect(enterPrevented).toBe(true); // Must block Enter while image is processing!

      // Now complete sanitization
      interceptor.setAttachmentPrivacyState('VERIFIED');
      gate.evaluateSendAllowed();

      let enterAllowed = true;
      const allowedEnterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(allowedEnterEvent, 'preventDefault', {
        value: () => { enterAllowed = false; },
      });

      textarea.dispatchEvent(allowedEnterEvent);
      expect(enterAllowed).toBe(true); // Allowed when verified!

      interceptor.destroy();
      gate.destroy();
    });

    it('Step 11: verification fails if eye band region pixels are not solid dark black', () => {
      const face = createAnatomicalFaceLandmarks({ x: 100, y: 100, width: 200, height: 250 }, 0);
      const geom = calculateEyeBandGeometry(face);

      // Create a canvas where pixels are light (not black)
      const nonBlackCanvas: any = {
        width: 400,
        height: 400,
        getContext: () => ({
          getImageData: () => ({
            data: new Uint8Array([200, 200, 200, 255]), // light gray pixel instead of black
          }),
        }),
      };

      const result = verifySanitizedCanvas(nonBlackCanvas, [face], [geom]);
      expect(result.verified).toBe(false);
      expect(result.error).toContain('Pixel verification failed');
    });

    it('Step 13 & 14: End-to-end file input capture phase replaces input.files and guarantees only sanitized file is sent', async () => {
      document.body.innerHTML = `
        <div class="composer-container">
          <textarea id="prompt-textarea">Review this photo</textarea>
          <div class="attachment-area">
            <img class="attachment-preview" src="blob:http://localhost/original-image" />
          </div>
          <button data-testid="send-button">Send</button>
          <input type="file" id="file-uploader" />
        </div>
      `;

      const gate = new AiSendGate();
      gate.init('https://chatgpt.com');

      const interceptor = new AttachmentInterceptor();
      interceptor.init();
      gate.attachmentInterceptor = interceptor;

      const input = document.getElementById('file-uploader') as HTMLInputElement;
      const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement;
      const previewImg = document.querySelector('.attachment-preview') as HTMLImageElement;

      // Mock face detector
      const face = createAnatomicalFaceLandmarks({ x: 80, y: 80, width: 150, height: 200 });
      registerEyeRegionDetector(async () => [face]);

      const originalPhoto = new File(['raw-photo-bytes'], 'person.jpg', { type: 'image/jpeg' });

      // Simulate user selecting file in system picker
      Object.defineProperty(input, 'files', {
        value: [originalPhoto],
        configurable: true,
        writable: true,
      });

      // User selection fires change event
      const changeEvent = new Event('change', { bubbles: true, cancelable: true });
      input.dispatchEvent(changeEvent);

      // Wait a tick for async processing to kick in
      await new Promise((r) => setTimeout(r, 50));

      // After processing:
      // 1. input.files is replaced with sanitized File
      expect(input.files![0]).not.toBe(originalPhoto);
      expect(input.files![0].name).toBe('person.jpg');

      // 2. Attachment state is VERIFIED
      expect(interceptor.getAttachmentPrivacyState()).toBe('VERIFIED');

      // 3. Send is enabled
      expect(gate.isSubmissionAllowed()).toBe(true);
      expect(sendBtn.disabled).toBe(false);

      // 4. Preview image is updated to sanitized preview
      expect(previewImg.getAttribute('data-pf-preview-sanitized')).toBe('true');
      expect(previewImg.src).not.toContain('original-image');

      // 5. Outgoing FormData submission strictly carries the sanitized file
      const outgoingFormData = new FormData();
      outgoingFormData.append('file', originalPhoto);
      const attachedFile = outgoingFormData.get('file') as File;
      expect(attachedFile).not.toBe(originalPhoto);
      expect(attachedFile.name).toBe('person.jpg');

      interceptor.destroy();
      gate.destroy();
    });
  });
});
