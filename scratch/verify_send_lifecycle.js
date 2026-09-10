const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

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
  
  // Set up an AI chat interface matching ChatGPT / generic AI composer
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>AI Assistant</title>
      <style>
        body { font-family: sans-serif; background: #212121; color: white; display: flex; justify-content: center; padding: 40px; }
        .composer-box { position: fixed; bottom: 20px; width: 600px; background: #2f2f2f; border-radius: 24px; padding: 12px; display: flex; align-items: flex-end; }
        #prompt-textarea { flex: 1; background: transparent; border: none; outline: none; color: white; font-size: 16px; resize: none; min-height: 24px; max-height: 200px; }
        button[data-testid="send-button"] {
          background: #ffffff;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          margin-left: 8px;
          transition: opacity 0.2s;
        }
        button[data-testid="send-button"]:disabled {
          background: #676767;
          cursor: not-allowed;
        }
        svg { width: 20px; height: 20px; fill: #000; }
      </style>
    </head>
    <body>
      <div class="composer-box">
        <textarea id="prompt-textarea" placeholder="Ask anything..."></textarea>
        <button data-testid="send-button" aria-label="Send prompt">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
        </button>
      </div>
    </body>
    </html>
  `);

  // Load extension content script
  const contentJs = fs.readFileSync(path.join(extensionPath, 'public', 'content.js'), 'utf-8');
  await page.evaluate(contentJs);

  console.log('--- Step 1: Initial State (Empty composer) ---');
  let btnState = await page.evaluate(() => {
    const btn = document.querySelector('button[data-testid="send-button"]');
    const comp = document.getElementById('prompt-textarea');
    return {
      btnExists: Boolean(btn),
      btnVisible: btn ? window.getComputedStyle(btn).display !== 'none' && window.getComputedStyle(btn).visibility !== 'hidden' && window.getComputedStyle(btn).opacity !== '0' : false,
      btnOpacity: btn ? window.getComputedStyle(btn).opacity : null,
      btnPointerEvents: btn ? window.getComputedStyle(btn).pointerEvents : null,
      btnDisabled: btn ? btn.disabled : null,
      composerValue: comp ? comp.value : null
    };
  });
  console.log('Initial Button State:', btnState);
  if (!btnState.btnVisible) throw new Error('FAIL: Button not visible on initial load!');

  const artifactDir = '/Users/vikranthreddy/.gemini/antigravity-ide/brain/ead9aeeb-dde7-4177-86e1-f0642e2c89c2';
  await page.screenshot({ path: path.join(artifactDir, 'send_button_empty.png') });

  console.log('--- Step 2: Typing 9954634442 ---');
  await page.focus('#prompt-textarea');
  await page.type('#prompt-textarea', '9954634442');
  await page.screenshot({ path: path.join(artifactDir, 'send_button_typing.png') });

  // Immediately check button state during sensitive detection
  btnState = await page.evaluate(() => {
    const btn = document.querySelector('button[data-testid="send-button"]');
    const badge = document.getElementById('__pf_ai_send_gate_badge__');
    return {
      btnVisible: btn ? window.getComputedStyle(btn).display !== 'none' && window.getComputedStyle(btn).visibility !== 'hidden' && window.getComputedStyle(btn).opacity !== '0' : false,
      btnOpacity: btn ? window.getComputedStyle(btn).opacity : null,
      btnPointerEvents: btn ? window.getComputedStyle(btn).pointerEvents : null,
      btnDisabled: btn ? btn.disabled : null,
      badgeText: badge ? badge.textContent : null,
      badgeDisplay: badge ? badge.style.display : null
    };
  });
  console.log('During typing / detection:', btnState);
  if (!btnState.btnVisible) throw new Error('FAIL: Button disappeared during typing!');

  console.log('--- Step 3: Waiting for Automatic Sanitization Pipeline ---');
  await page.waitForFunction(() => {
    const comp = document.getElementById('prompt-textarea');
    return comp && comp.value.includes('[PHONE_NUMBER]');
  }, { timeout: 3000 });

  // Check state after sanitization
  const finalState = await page.evaluate(() => {
    const btn = document.querySelector('button[data-testid="send-button"]');
    const comp = document.getElementById('prompt-textarea');
    const badge = document.getElementById('__pf_ai_send_gate_badge__');
    return {
      composerValue: comp ? comp.value : null,
      btnVisible: btn ? window.getComputedStyle(btn).display !== 'none' && window.getComputedStyle(btn).visibility !== 'hidden' && window.getComputedStyle(btn).opacity !== '0' : false,
      btnOpacity: btn ? window.getComputedStyle(btn).opacity : null,
      btnPointerEvents: btn ? window.getComputedStyle(btn).pointerEvents : null,
      btnDisabled: btn ? btn.disabled : null,
      badgeText: badge ? badge.textContent : null
    };
  });
  console.log('Final Sanitized State:', finalState);

  if (finalState.composerValue !== '[PHONE_NUMBER]') {
    throw new Error(`FAIL: Composer value expected "[PHONE_NUMBER]", got: "${finalState.composerValue}"`);
  }
  if (!finalState.btnVisible) {
    throw new Error('FAIL: Send button is NOT visible!');
  }
  if (finalState.btnDisabled !== false) {
    throw new Error('FAIL: Send button should be ENABLED (disabled === false)!');
  }
  if (finalState.btnOpacity === '0.4') {
    throw new Error('FAIL: Send button has opacity 0.4!');
  }
  if (finalState.btnPointerEvents === 'none') {
    throw new Error('FAIL: Send button has pointer-events: none!');
  }

  await page.screenshot({ path: path.join(artifactDir, 'send_button_verified.png') });
  console.log('Saved screenshot to:', path.join(artifactDir, 'send_button_verified.png'));

  console.log('SUCCESS: All checks passed perfectly!');
  await browser.close();
})().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
