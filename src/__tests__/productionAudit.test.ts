import { DetectionEngine } from '../detectors/detectionEngine';
import { validateLuhn, runAllPatterns } from '../detectors/regexDetector';
import { computeRiskScore, buildScanReport } from '../core/utils';
import { isAllowlisted } from '../detectors/allowlist';
import { ScanResult } from '../core/types';

describe('Production Audit Test Suite', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('1. Login Page Detection', () => {
    it('accurately detects email and password fields on login form', async () => {
      document.body.innerHTML = `
        <form id="login-form">
          <label for="user-email">Email Address</label>
          <input type="email" id="user-email" value="alex.dev@gmail.com" />
          <label for="user-pass">Password</label>
          <input type="password" id="user-pass" value="SuperSecret123!" />
          <button type="submit">Sign In</button>
        </form>
      `;

      const engine = new DetectionEngine();
      const items = await engine.run();

      const emailItem = items.find((i) => i.type === 'EMAIL');
      const passwordItem = items.find((i) => i.type === 'PASSWORD');

      expect(emailItem).toBeDefined();
      expect(emailItem?.value).toBe('alex.dev@gmail.com');
      expect(emailItem?.location.selector).toBe('#user-email');

      expect(passwordItem).toBeDefined();
      expect(passwordItem?.value).toBe('SuperSecret123!');
      expect(passwordItem?.location.selector).toBe('#user-pass');

      // Verify risk score calculation for Email + Password combo = 40
      const score = computeRiskScore(items);
      expect(score).toBe(40);
    });

    it('ignores static password labels and buttons', async () => {
      document.body.innerHTML = `
        <div>
          <span>Enter your password below</span>
          <button>Forgot password?</button>
          <input type="text" placeholder="Search website..." value="password reset documentation" />
        </div>
      `;

      const engine = new DetectionEngine();
      const items = await engine.run();

      const passwordItem = items.find((i) => i.type === 'PASSWORD');
      expect(passwordItem).toBeUndefined();
    });
  });

  describe('2. Registration Page Detection', () => {
    it('detects registration PII: Name, Email, Password, Phone', async () => {
      document.body.innerHTML = `
        <form id="register-form">
          <input type="text" name="full_name" value="Jane Doe" />
          <input type="email" name="user_email" value="jane.doe@example.org" />
          <input type="tel" name="phone_number" value="+1 (555) 234-5678" />
          <input type="password" name="new_password" value="ComplexP@ssw0rd2026" />
        </form>
      `;

      const engine = new DetectionEngine();
      const items = await engine.run();

      expect(items.some((i) => i.type === 'NAME')).toBe(true);
      expect(items.some((i) => i.type === 'EMAIL')).toBe(true);
      expect(items.some((i) => i.type === 'PASSWORD')).toBe(true);
      expect(items.some((i) => i.type === 'PHONE')).toBe(true);
    });
  });

  describe('3. Credit Card Detection & Luhn Check', () => {
    it('validates authentic credit card numbers and rejects invalid digits', () => {
      // Valid Visa card
      expect(validateLuhn('4532 0151 1283 0366')).toBe(true);
      // Valid 16-digit Luhn test card
      expect(validateLuhn('4992 7398 7164 1234')).toBe(true);
      // Invalid Luhn digit sequence
      expect(validateLuhn('4532 0151 1283 0365')).toBe(false);
    });

    it('detects valid credit card in form input and calculates score 75', async () => {
      document.body.innerHTML = `
        <input type="text" id="card-num" value="4532 0151 1283 0366" />
      `;

      const engine = new DetectionEngine();
      const items = await engine.run();

      const cardItem = items.find((i) => i.type === 'CARD');
      expect(cardItem).toBeDefined();
      expect(cardItem?.confidence).toBeGreaterThanOrEqual(0.95);

      const score = computeRiskScore(items);
      expect(score).toBe(75);
    });
  });

  describe('4. Secrets & API Keys Detection', () => {
    it('detects OpenAI, GitHub, AWS, and Stripe keys with 80+ risk score', async () => {
      document.body.innerHTML = `
        <pre>
          const openaiKey = "sk-proj-abc123456789012345678901234567890";
          const githubToken = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
          const awsKey = "AKIAIOSFODNN7EXAMPLE";
          const stripeKey = "sk_test_51HzABC12345678901234567890123456";
        </pre>
      `;

      const engine = new DetectionEngine();
      const items = await engine.run();

      expect(items.some((i) => i.type === 'OPENAI_KEY')).toBe(true);
      expect(items.some((i) => i.type === 'GITHUB_TOKEN')).toBe(true);
      expect(items.some((i) => i.type === 'AWS_KEY')).toBe(true);
      expect(items.some((i) => i.type === 'STRIPE_KEY')).toBe(true);

      // Multiple secrets = risk score 100
      expect(computeRiskScore(items)).toBe(100);
    });
  });

  describe('5. Major Homepage Allowlist & Zero False-Positive Checks', () => {
    it('produces 0 detections on ChatGPT homepage layout', async () => {
      document.body.innerHTML = `
        <div class="chat-history">
          <a href="#">ChatGPT Prompt History</a>
          <button>New Chat</button>
        </div>
        <main>
          <h1>ChatGPT</h1>
          <p>How can I help you today?</p>
          <div class="gsi-material-button">
            <span>Sign in with Google</span>
          </div>
        </main>
      `;

      const engine = new DetectionEngine();
      const items = await engine.run();

      expect(items.length).toBe(0);
      expect(computeRiskScore(items)).toBe(0);
    });

    it('produces 0 detections on Google homepage layout', async () => {
      document.body.innerHTML = `
        <header>
          <a href="#">Gmail</a>
          <a href="#">Images</a>
        </header>
        <main>
          <img src="google-logo.png" alt="Google" />
          <input type="text" title="Search" value="React Vite Chrome Extension" />
          <button>Google Search</button>
          <button>I'm Feeling Lucky</button>
        </main>
      `;

      const engine = new DetectionEngine();
      const items = await engine.run();

      expect(items.length).toBe(0);
      expect(computeRiskScore(items)).toBe(0);
    });

    it('produces 0 detections on GitHub homepage layout', async () => {
      document.body.innerHTML = `
        <nav class="navbar">
          <a class="logo" href="#">GitHub</a>
          <a href="#">Product</a>
          <a href="#">Solutions</a>
          <a href="#">Open Source</a>
        </nav>
        <main>
          <h1>Build and ship software on GitHub</h1>
          <p>Join over 100 million developers creating the future of software together.</p>
        </main>
      `;

      const engine = new DetectionEngine();
      const items = await engine.run();

      expect(items.length).toBe(0);
      expect(computeRiskScore(items)).toBe(0);
    });
  });

  describe('6. Scan Report Generation', () => {
    it('includes complete location metadata (selector, cssPath, xpath, pageRegion, boundingBox)', () => {
      const mockScan: ScanResult = {
        url: 'https://example.com/login',
        tabId: 1,
        timestamp: Date.now(),
        riskScore: 40,
        sanitizedPayload: { login: '[PASSWORD]' },
        items: [
          {
            id: 'item-1',
            type: 'PASSWORD',
            value: 'secret123',
            placeholder: '[PASSWORD]',
            confidence: 1.0,
            method: 'dom',
            status: 'detected',
            timestamp: Date.now(),
            location: {
              selector: '#pass',
              cssPath: '#pass',
              xpath: '/html/body/input',
              pageLabel: 'Password Field',
              boundingBox: { x: 10, y: 20, width: 200, height: 40 },
            },
          },
        ],
      };

      const report = buildScanReport(mockScan);
      expect(report.website).toBe('example.com');
      expect(report.items.length).toBe(1);

      const item = report.items[0];
      expect(item.selector).toBe('#pass');
      expect(item.cssPath).toBe('#pass');
      expect(item.xpath).toBe('/html/body/input');
      expect(item.pageRegion).toBe('Password Field');
      expect(item.boundingBox).toEqual({ x: 10, y: 20, width: 200, height: 40 });
    });
  });
});
