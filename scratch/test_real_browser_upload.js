const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('=== STARTING REAL BROWSER EYE-LINE SANITIZATION TEST ===');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Setup simulated AI website (ChatGPT style)
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>ChatGPT Test Page</title>
      <style>
        body { font-family: sans-serif; background: #202123; color: white; padding: 20px; }
        .composer { display: flex; flex-direction: column; width: 600px; margin: 50px auto; background: #40414F; padding: 15px; border-radius: 8px; }
        #prompt-textarea { width: 100%; height: 60px; background: transparent; color: white; border: none; font-size: 16px; resize: none; outline: none; }
        .attachment-area { margin-bottom: 10px; }
        .attachment-area img { max-width: 150px; max-height: 150px; border-radius: 4px; }
        .bottom-bar { display: flex; justify-content: space-between; align-items: center; }
        button[data-testid="send-button"] { background: #19C37D; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        button[data-testid="send-button"]:disabled { background: #6E707E; cursor: not-allowed; }
      </style>
    </head>
    <body>
      <div class="composer">
        <div class="attachment-area" id="preview-container"></div>
        <textarea id="prompt-textarea" placeholder="Send a message..."></textarea>
        <div class="bottom-bar">
          <input type="file" id="file-uploader" accept="image/*" />
          <button data-testid="send-button">Send</button>
        </div>
      </div>

      <script>
        // Website's native handler (like ChatGPT React)
        const fileInput = document.getElementById('file-uploader');
        const previewContainer = document.getElementById('preview-container');
        window.uploadedFiles = [];

        fileInput.addEventListener('change', function(e) {
          const files = e.target.files;
          if (files && files.length > 0) {
            window.uploadedFiles = Array.from(files);
            previewContainer.innerHTML = '';
            for (const file of files) {
              const img = document.createElement('img');
              img.className = 'attachment-preview';
              img.src = URL.createObjectURL(file);
              img.setAttribute('alt', file.name);
              previewContainer.appendChild(img);
            }
          }
        });
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);

  // 2. Inject the compiled content script bundle
  const contentScriptCode = fs.readFileSync(path.join(__dirname, '../public/content.js'), 'utf8');
  await page.evaluate((code) => {
    const s = document.createElement('script');
    s.textContent = code;
    document.head.appendChild(s);
  }, contentScriptCode);

  console.log('✓ Content script injected successfully into page');

  // 3. Create a realistic portrait image inside browser canvas with clear face & eyes
  const imageData = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(0, 0, 400, 500);

    // Face oval with realistic skin tone (R: 225, G: 175, B: 145)
    ctx.fillStyle = 'rgb(225, 175, 145)';
    ctx.beginPath();
    ctx.ellipse(200, 240, 110, 150, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes: Left eye center at (160, 210), Right eye center at (240, 210)
    // Sclera (white)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(160, 210, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(240, 210, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Irises (blue)
    ctx.fillStyle = '#2563EB';
    ctx.beginPath();
    ctx.arc(160, 210, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(240, 210, 8, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (dark)
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(160, 210, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(240, 210, 4, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#991B1B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(200, 310, 35, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      }, 'image/png');
    });
  });

  const testImagePath = path.join(__dirname, 'portrait_original.png');
  const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(testImagePath, base64Data, 'base64');
  console.log('✓ Generated original portrait image saved at:', testImagePath);

  // 4. Attach image via input file element
  const fileInputEl = await page.$('#file-uploader');
  await fileInputEl.uploadFile(testImagePath);

  console.log('✓ Image file uploaded into file input');

  // Wait for asynchronous sanitization pipeline to run
  await new Promise((r) => setTimeout(r, 1200));

  // 5. Query results from page
  const pageResult = await page.evaluate(async () => {
    const input = document.getElementById('file-uploader');
    const files = input.files;
    const uploaded = window.uploadedFiles;
    const preview = document.querySelector('.attachment-preview');
    const sendBtn = document.querySelector('button[data-testid="send-button"]');

    let previewSrc = preview ? preview.src : null;
    let previewDataUrl = null;

    if (preview) {
      const c = document.createElement('canvas');
      c.width = preview.naturalWidth || 400;
      c.height = preview.naturalHeight || 500;
      const ctx = c.getContext('2d');
      ctx.drawImage(preview, 0, 0, c.width, c.height);

      // Sample pixels across the eye line
      // Left eye at (160, 210), Right eye at (240, 210), Center at (200, 210)
      const centerPixel = Array.from(ctx.getImageData(200, 210, 1, 1).data);
      const leftEyePixel = Array.from(ctx.getImageData(160, 210, 1, 1).data);
      const rightEyePixel = Array.from(ctx.getImageData(240, 210, 1, 1).data);
      // Non-eye pixel: forehead (200, 160) should NOT be black
      const foreheadPixel = Array.from(ctx.getImageData(200, 160, 1, 1).data);

      previewDataUrl = c.toDataURL('image/png');

      return {
        hasInputFiles: files && files.length > 0,
        inputFileCount: files ? files.length : 0,
        inputFileName: files && files[0] ? files[0].name : null,
        inputFileSize: files && files[0] ? files[0].size : 0,
        uploadedCount: uploaded ? uploaded.length : 0,
        uploadedName: uploaded && uploaded[0] ? uploaded[0].name : null,
        uploadedSize: uploaded && uploaded[0] ? uploaded[0].size : 0,
        previewSrc,
        sendDisabled: sendBtn ? sendBtn.disabled : true,
        centerPixel,
        leftEyePixel,
        rightEyePixel,
        foreheadPixel,
        previewDataUrl
      };
    }

    return { error: 'No preview found' };
  });

  console.log('\n================ ACTUAL EXECUTION REPORT ================');
  console.log('INPUT FILES PRESENT:', pageResult.hasInputFiles);
  console.log('INPUT FILE NAME:', pageResult.inputFileName);
  console.log('INPUT FILE SIZE (bytes):', pageResult.inputFileSize);
  console.log('WEBSITE RECEIVED ATTACHMENT COUNT:', pageResult.uploadedCount);
  console.log('WEBSITE ATTACHED FILE SIZE:', pageResult.uploadedSize);
  console.log('EYE BAND CENTER PIXEL (200, 210):', pageResult.centerPixel);
  console.log('LEFT EYE PIXEL (160, 210):', pageResult.leftEyePixel);
  console.log('RIGHT EYE PIXEL (240, 210):', pageResult.rightEyePixel);
  console.log('FOREHEAD PIXEL (200, 160):', pageResult.foreheadPixel);
  console.log('SEND BUTTON DISABLED:', pageResult.sendDisabled);

  // Save the sanitized output image to disk for inspection
  if (pageResult.previewDataUrl) {
    const sanitizedImagePath = path.join(__dirname, 'portrait_sanitized.png');
    const cleanBase64 = pageResult.previewDataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(sanitizedImagePath, cleanBase64, 'base64');
    console.log('✓ Sanitized output image physically saved to:', sanitizedImagePath);
  }

  // Verification assertions
  const isCenterBlack = pageResult.centerPixel[0] === 0 && pageResult.centerPixel[1] === 0 && pageResult.centerPixel[2] === 0;
  const isLeftEyeBlack = pageResult.leftEyePixel[0] === 0 && pageResult.leftEyePixel[1] === 0 && pageResult.leftEyePixel[2] === 0;
  const isRightEyeBlack = pageResult.rightEyePixel[0] === 0 && pageResult.rightEyePixel[1] === 0 && pageResult.rightEyePixel[2] === 0;
  const isForeheadPreserved = pageResult.foreheadPixel[0] > 100;

  console.log('\n--- VERIFICATION STATUS ---');
  console.log('Solid black bar over eye center:', isCenterBlack ? 'PASS (0,0,0,255)' : 'FAIL');
  console.log('Solid black bar over left eye/iris:', isLeftEyeBlack ? 'PASS (0,0,0,255)' : 'FAIL');
  console.log('Solid black bar over right eye/iris:', isRightEyeBlack ? 'PASS (0,0,0,255)' : 'FAIL');
  console.log('Forehead / context preserved:', isForeheadPreserved ? 'PASS (Preserved)' : 'FAIL');

  await browser.close();

  if (!isCenterBlack || !isLeftEyeBlack || !isRightEyeBlack) {
    throw new Error('Black eye-bar verification failed!');
  }

  console.log('\n=== ALL PHYSICAL EYE-BAR SANITIZATION CHECKS PASSED ===');
}

run().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
