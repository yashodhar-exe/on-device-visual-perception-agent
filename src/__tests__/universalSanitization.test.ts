import { AiSendGate } from '../privacy/aiSendGate';

describe('Universal Automatic Sanitization Test Matrix (Sections 3, 24, 25)', () => {
  let gate: AiSendGate;
  let textarea: HTMLTextAreaElement;
  let sendButton: HTMLButtonElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="composer-container">
        <textarea id="prompt-textarea"></textarea>
        <button id="send-button" data-testid="send-button">Send</button>
      </div>
    `;
    textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
    sendButton = document.getElementById('send-button') as HTMLButtonElement;
    gate = new AiSendGate();
    gate.init('https://chatgpt.com');
  });

  afterEach(() => {
    gate.destroy();
    document.body.innerHTML = '';
  });

  const runSanitizationTest = async (input: string, expectedOutput: string) => {
    textarea.value = input;
    // Trigger input event
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    // Wait for async detection and sanitization
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(textarea.value).toBe(expectedOutput);
    expect(gate.getPrivacyState()).toBe('VERIFIED');
    expect(gate.isSendAllowed()).toBe(true);
    expect(sendButton.style.display).not.toBe('none');
    expect(sendButton.getAttribute('data-privacy-blocked')).toBeNull();
  };

  test('1. PHONE: 9954634442 -> [PHONE_NUMBER]', async () => {
    await runSanitizationTest('9954634442', '[PHONE_NUMBER]');
  });

  test('2. EMAIL: vikranth@gmail.com -> [EMAIL]', async () => {
    await runSanitizationTest('vikranth@gmail.com', '[EMAIL]');
  });

  test('3. AADHAAR: 1234 5678 9012 -> [AADHAAR]', async () => {
    await runSanitizationTest('1234 5678 9012', '[AADHAAR]');
  });

  test('4. PAN: ABCDE1234F -> [PAN]', async () => {
    await runSanitizationTest('ABCDE1234F', '[PAN]');
  });

  test('5. CREDIT CARD: 4111 1111 1111 1111 -> [CREDIT_CARD]', async () => {
    await runSanitizationTest('4111 1111 1111 1111', '[CREDIT_CARD]');
  });

  test('6. API KEY: sk-test-7fK9mQ2xLp4Vn8Rz6Tj3Hs5Wc1Yb0DgA -> [API_KEY]', async () => {
    await runSanitizationTest('sk-test-7fK9mQ2xLp4Vn8Rz6Tj3Hs5Wc1Yb0DgA', '[API_KEY]');
  });

  test('7. JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... -> [JWT]', async () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    await runSanitizationTest(jwt, '[JWT]');
  });

  test('8. DATABASE URL: postgresql://user:password@host/database -> [DATABASE_URL]', async () => {
    await runSanitizationTest('postgresql://user:password@host/database', '[DATABASE_URL]');
  });

  test('9. PASSWORD: My password is SuperSecret123! -> My password is [PASSWORD]', async () => {
    await runSanitizationTest('My password is SuperSecret123!', 'My password is [PASSWORD]');
  });

  test('10. Surrounding text preservation (Section 4)', async () => {
    await runSanitizationTest(
      'My phone is 9954634442 and my email is vikranth@gmail.com',
      'My phone is [PHONE_NUMBER] and my email is [EMAIL]'
    );
  });

  test('11. Multiple secret types in one message (Section 5)', async () => {
    await runSanitizationTest(
      'My phone is 9954634442, email is vikranth@gmail.com and API key is sk-test-7fK9mQ2xLp4Vn8Rz6Tj3Hs5Wc1Yb0DgA',
      'My phone is [PHONE_NUMBER], email is [EMAIL] and API key is [API_KEY]'
    );
  });

  test('12. Paste transformation with multiple newlines (Section 16)', async () => {
    const pasted = 'Phone 9954634442\nEmail vikranth@gmail.com\nKey sk-test-7fK9mQ2xLp4Vn8Rz6Tj3Hs5Wc1Yb0DgA';
    const expected = 'Phone [PHONE_NUMBER]\nEmail [EMAIL]\nKey [API_KEY]';
    await runSanitizationTest(pasted, expected);
  });

  describe('Negative tests (Section 25) - Normal content must remain unchanged', () => {
    const runNegativeTest = async (text: string) => {
      textarea.value = text;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(textarea.value).toBe(text);
      expect(gate.getPrivacyState()).toBe('VERIFIED');
      expect(gate.isSendAllowed()).toBe(true);
      expect(sendButton.getAttribute('data-privacy-blocked')).toBeNull();
    };

    test('"Call me tomorrow at 10"', async () => {
      await runNegativeTest('Call me tomorrow at 10');
    });

    test('"Order number 12345"', async () => {
      await runNegativeTest('Order number 12345');
    });

    test('"The server returned status 500"', async () => {
      await runNegativeTest('The server returned status 500');
    });

    test('"Version 2.5.1"', async () => {
      await runNegativeTest('Version 2.5.1');
    });

    test('"DAA has 10 modules"', async () => {
      await runNegativeTest('DAA has 10 modules');
    });
  });
});
