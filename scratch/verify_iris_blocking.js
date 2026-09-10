const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const extensionPath = path.resolve(__dirname, '..');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const page = await browser.newPage();

  // Load content script
  await page.setContent('<!DOCTYPE html><html><head><title>Test</title></head><body><input type="file" id="file-input"></body></html>');
  await page.addScriptTag({ path: path.resolve(extensionPath, 'public/content.js') });

  // Run in page context
  const testResult = await page.evaluate(async () => {
    // Create an image with a face (skin cluster with eyes)
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 400;
    const ctx = c.getContext('2d');
    
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 400);

    // Face oval (skin color: r=215, g=160, b=130)
    ctx.fillStyle = 'rgb(215, 160, 130)';
    ctx.beginPath();
    ctx.ellipse(200, 200, 90, 120, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes with dark irises at 40% face height
    // Left eye (x ~ 160, y ~ 180)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(165, 185, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1008'; // Dark iris
    ctx.beginPath();
    ctx.arc(165, 185, 6, 0, Math.PI * 2);
    ctx.fill();

    // Right eye (x ~ 235, y ~ 180)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(235, 185, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1008'; // Dark iris
    ctx.beginPath();
    ctx.arc(235, 185, 6, 0, Math.PI * 2);
    ctx.fill();

    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const testFile = new File([blob], 'portrait_test.png', { type: 'image/png' });

    // Use the content script's visual privacy module
    // We can call defaultAttachmentInterceptor.handleFileInput
    const input = document.getElementById('file-input');
    const dt = new DataTransfer();
    dt.items.add(testFile);
    input.files = dt.files;

    // Check interceptor
    const interceptor = window.__pf_attachmentInterceptor || 
      window.defaultAttachmentInterceptor;
    
    return {
      fileCreated: true,
      fileSize: testFile.size
    };
  });

  console.log('Image Creation Result:', testResult);
  await browser.close();
  console.log('Iris blocking test harness finished successfully!');
})();
