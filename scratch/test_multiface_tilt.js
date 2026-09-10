const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testMultiAndTilt() {
  console.log('=== MULTI-FACE & TILT ACCEPTANCE TEST ===');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.setContent(`<!DOCTYPE html><html><body><input type="file" id="multi-uploader" /></body></html>`);

  const contentScriptCode = fs.readFileSync(path.join(__dirname, '../public/content.js'), 'utf8');
  await page.evaluate((code) => {
    const s = document.createElement('script');
    s.textContent = code;
    document.head.appendChild(s);
  }, contentScriptCode);

  // 1. Create a 2-person image: Person 1 at (150, 200), Person 2 at (350, 200)
  const multiImageData = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(0, 0, 500, 400);

    // Person 1
    ctx.fillStyle = 'rgb(225, 175, 145)';
    ctx.beginPath();
    ctx.ellipse(150, 200, 70, 100, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eyes 1
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(125, 180, 15, 8, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(175, 180, 15, 8, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1E3A8A';
    ctx.beginPath(); ctx.arc(125, 180, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(175, 180, 5, 0, Math.PI*2); ctx.fill();

    // Person 2
    ctx.fillStyle = 'rgb(215, 160, 130)';
    ctx.beginPath();
    ctx.ellipse(350, 200, 70, 100, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eyes 2
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(325, 180, 15, 8, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(375, 180, 15, 8, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#065F46';
    ctx.beginPath(); ctx.arc(325, 180, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(375, 180, 5, 0, Math.PI*2); ctx.fill();

    return new Promise(r => canvas.toBlob(b => {
      const reader = new FileReader();
      reader.onloadend = () => r(reader.result);
      reader.readAsDataURL(b);
    }, 'image/png'));
  });

  const multiPath = path.join(__dirname, 'multi_original.png');
  fs.writeFileSync(multiPath, multiImageData.replace(/^data:image\/png;base64,/, ''), 'base64');

  const multiInput = await page.$('#multi-uploader');
  await multiInput.uploadFile(multiPath);
  await new Promise(r => setTimeout(r, 1200));

  const multiResult = await page.evaluate(async () => {
    const input = document.getElementById('multi-uploader');
    const file = input.files[0];
    const c = document.createElement('canvas');
    c.width = 500;
    c.height = 400;
    const ctx = c.getContext('2d');
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise(r => { img.onload = r; });
    ctx.drawImage(img, 0, 0);

    // Person 1 eye band at (150, 180)
    const p1Band = Array.from(ctx.getImageData(150, 180, 1, 1).data);
    // Person 2 eye band at (350, 180)
    const p2Band = Array.from(ctx.getImageData(350, 180, 1, 1).data);

    return {
      name: file.name,
      size: file.size,
      p1Band,
      p2Band,
      dataUrl: c.toDataURL('image/png')
    };
  });

  console.log('MULTI-PERSON FILE NAME:', multiResult.name);
  console.log('PERSON 1 EYE BAND PIXEL:', multiResult.p1Band);
  console.log('PERSON 2 EYE BAND PIXEL:', multiResult.p2Band);

  const p1Black = multiResult.p1Band[0] === 0 && multiResult.p1Band[1] === 0 && multiResult.p1Band[2] === 0;
  const p2Black = multiResult.p2Band[0] === 0 && multiResult.p2Band[1] === 0 && multiResult.p2Band[2] === 0;

  console.log('PERSON 1 SANITIZED:', p1Black ? 'PASS' : 'FAIL');
  console.log('PERSON 2 SANITIZED:', p2Black ? 'PASS' : 'FAIL');

  fs.writeFileSync(path.join(__dirname, 'multi_sanitized.png'), multiResult.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

  await browser.close();

  if (!p1Black || !p2Black) {
    throw new Error('Multi-face sanitization check failed!');
  }

  console.log('=== MULTI-FACE ACCEPTANCE TEST PASSED ===');
}

testMultiAndTilt().catch(e => {
  console.error(e);
  process.exit(1);
});
