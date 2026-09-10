const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Draw a realistic face on a canvas in the browser
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
      <canvas id="testCanvas" width="600" height="600"></canvas>
    </body>
    </html>
  `);

  await page.addScriptTag({ path: path.resolve(__dirname, '../public/content.js') });

  const result = await page.evaluate(async () => {
    const canvas = document.getElementById('testCanvas');
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 600, 600);

    // Draw face oval (realistic Caucasian/Asian/Indian skin tone: r=210, g=155, b=125)
    ctx.fillStyle = 'rgb(210, 155, 125)';
    ctx.beginPath();
    ctx.ellipse(300, 280, 120, 160, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes:
    // Left eye at (250, 250)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(250, 250, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#201510'; // Dark iris
    ctx.beginPath();
    ctx.arc(250, 250, 8, 0, Math.PI * 2);
    ctx.fill();

    // Right eye at (350, 250)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(350, 250, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#201510'; // Dark iris
    ctx.beginPath();
    ctx.arc(350, 250, 8, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows at (250, 225) and (350, 225)
    ctx.strokeStyle = '#201510';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(230, 225); ctx.lineTo(270, 225);
    ctx.moveTo(330, 225); ctx.lineTo(370, 225);
    ctx.stroke();

    // Convert canvas to Blob/File
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const file = new File([blob], 'test_face.png', { type: 'image/png' });

    // Read pixel before sanitization at left eye iris (250, 250)
    const beforeEyePixel = Array.from(ctx.getImageData(250, 250, 1, 1).data);

    // Access visual privacy functions exposed by content.js or test sanitizeImageLocally
    // Let's test window.defaultAttachmentInterceptor or sanitize
    return {
      beforeEyePixel,
      fileSize: file.size
    };
  });

  console.log('Canvas Setup Result:', result);
  await browser.close();
})();
