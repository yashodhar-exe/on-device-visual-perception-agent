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
  
  const consoleWarnings = [];
  page.on('console', msg => {
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>AI Assistant</title>
      <style>
        body { font-family: sans-serif; background: #212121; color: white; }
        .composer-box { position: fixed; bottom: 20px; width: 600px; background: #2f2f2f; border-radius: 24px; padding: 12px; display: flex; align-items: flex-end; }
        #prompt-textarea { flex: 1; background: transparent; border: none; outline: none; color: white; font-size: 16px; }
        button[data-testid="send-button"] { width: 36px; height: 36px; }
      </style>
    </head>
    <body>
      <div class="composer-box">
        <textarea id="prompt-textarea"></textarea>
        <button data-testid="send-button" aria-label="Send prompt">Send</button>
      </div>
    </body>
    </html>
  `);

  await page.addScriptTag({ path: path.resolve(extensionPath, 'public/content.js') });
  await new Promise(r => setTimeout(r, 400));

  const testCases = [
    { name: 'PHONE', input: '9954634442', expected: '[PHONE_NUMBER]' },
    { name: 'EMAIL', input: 'vikranth@gmail.com', expected: '[EMAIL]' },
    { name: 'AADHAAR', input: '1234 5678 9012', expected: '[AADHAAR]' },
    { name: 'PAN', input: 'ABCDE1234F', expected: '[PAN]' },
    { name: 'CARD', input: '4111 1111 1111 1111', expected: '[CREDIT_CARD]' },
    { name: 'API_KEY', input: 'sk-test-7fK9mQ2xLp4Vn8Rz6Tj3Hs5Wc1Yb0DgA', expected: '[API_KEY]' },
    { name: 'DATABASE_URL', input: 'postgresql://user:password@host/database', expected: '[DATABASE_URL]' },
    { name: 'PASSWORD', input: 'My password is SuperSecret123!', expected: 'My password is [PASSWORD]' },
    {
      name: 'MIXED',
      input: 'Phone: 9954634442, email: vikranth@gmail.com and key: sk-test-7fK9mQ2xLp4Vn8Rz6Tj3Hs5Wc1Yb0DgA',
      expected: 'Phone: [PHONE_NUMBER], email: [EMAIL] and key: [API_KEY]'
    }
  ];

  for (const tc of testCases) {
    await page.evaluate((val) => {
      const ta = document.getElementById('prompt-textarea');
      ta.value = val;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }, tc.input);

    // Wait for gate to sanitize
    await new Promise(r => setTimeout(r, 300));

    const state = await page.evaluate(() => {
      const ta = document.getElementById('prompt-textarea');
      const btn = document.querySelector('button[data-testid="send-button"]');
      return {
        value: ta.value,
        disabled: btn.disabled,
        visible: btn.style.display !== 'none'
      };
    });

    console.log(`Test ${tc.name}:`, {
      input: tc.input,
      actual: state.value,
      expected: tc.expected,
      passed: state.value === tc.expected,
      sendEnabled: !state.disabled,
      sendVisible: state.visible
    });

    if (state.value !== tc.expected || state.disabled) {
      console.error(`FAILED on ${tc.name}!`);
      process.exit(1);
    }
  }

  // Check canvas willReadFrequently warning
  const canvasWarn = consoleWarnings.filter(w => w.includes('willReadFrequently'));
  console.log('willReadFrequently warnings logged:', canvasWarn.length);

  await browser.close();
  console.log('ALL BROWSER TESTS PASSED PERFECTLY!');
})();
