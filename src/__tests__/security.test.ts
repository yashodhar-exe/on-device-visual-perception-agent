/**
 * security.test.ts
 *
 * Comprehensive Security & Adversarial Defense Test Suite.
 * Validates:
 * 1. Prompt injection neutralization (treating webpage as untrusted data)
 * 2. Malicious selector rejection (XSS, script injection, javascript: pseudo-protocols)
 * 3. Prototype pollution defense
 * 4. Arbitrary code execution prevention (eval, script execution blocked)
 * 5. Strict schema enforcement against action spoofing
 * 6. Mandatory confirmation for high-risk/sensitive actions
 * 7. Fail-closed network transmission enforcement
 */

import { executeBrowserAction, validateAction } from '../actions/actionExecutor';
import { shouldRequireConfirmation } from '../actions/confirmationHook';
import { validatePayloadIsSafe } from '../privacy/policyEngine';
import { AgentAction, AnalyzeRequest, SensitiveRegion } from '../core/types';

describe('Security & Threat Model Defense Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="login-form">
        <input type="text" id="username" value="validUser" />
        <input type="password" id="password" value="secret123" />
        <button type="submit" id="submit-btn">Login</button>
      </form>
      <div id="target-div" class="safe-element">Normal Content</div>
    `;
  });

  describe('1. Malicious Selector & Injection Defense', () => {
    it('rejects selectors attempting javascript: protocol injection', async () => {
      const maliciousAction: AgentAction = {
        id: 'sec-1',
        action: 'click',
        selector: 'a[href^="javascript:alert(1)"]',
        targetDescription: 'Malicious link',
      };

      const validation = validateAction(maliciousAction);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toMatch(/malicious or prohibited pattern/i);

      const result = await executeBrowserAction(maliciousAction, true);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/malicious or prohibited pattern/i);
    });

    it('rejects selectors containing script tags or html tags', async () => {
      const maliciousAction: AgentAction = {
        id: 'sec-2',
        action: 'click',
        selector: '<script>alert(document.cookie)</script>',
        targetDescription: 'Script injection selector',
      };

      const validation = validateAction(maliciousAction);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toMatch(/malicious or prohibited pattern/i);
    });

    it('rejects inline event handler selectors (e.g. onerror, onclick)', async () => {
      const maliciousAction: AgentAction = {
        id: 'sec-3',
        action: 'click',
        selector: 'img[onerror="alert(1)"]',
        targetDescription: 'Event handler selector',
      };

      const validation = validateAction(maliciousAction);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toMatch(/malicious or prohibited pattern/i);
    });

    it('rejects prototype pollution attempts in selectors or properties', async () => {
      const protoAction: AgentAction = {
        id: 'sec-4',
        action: 'click',
        selector: '__proto__.polluted',
        targetDescription: 'Prototype pollution selector',
      };

      const validation = validateAction(protoAction);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toMatch(/malicious or prohibited pattern/i);
    });
  });

  describe('2. Arbitrary Code Execution Prevention', () => {
    it('strictly rejects actions not in the allowed AgentAction whitelist', async () => {
      const disallowedAction: any = {
        id: 'sec-5',
        action: 'eval',
        code: 'alert(1)',
      };

      const validation = validateAction(disallowedAction);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toMatch(/unsupported or disallowed action/i);

      const execResult = await executeBrowserAction(disallowedAction, true);
      expect(execResult.success).toBe(false);
    });

    it('rejects execute_script or evaluate actions', async () => {
      const scriptAction: any = {
        id: 'sec-6',
        action: 'execute_script',
        selector: '#target-div',
        script: 'window.location="https://attacker.com"',
      };

      const validation = validateAction(scriptAction);
      expect(validation.valid).toBe(false);
    });
  });

  describe('3. Action Confirmation & Risk Tiering', () => {
    it('mandates confirmation for submit actions', () => {
      const submitAction: AgentAction = {
        id: 'sec-7',
        action: 'submit',
        selector: '#login-form',
      };

      const requires = shouldRequireConfirmation(submitAction);
      expect(requires).toBe(true);
    });

    it('mandates confirmation when interacting with password fields', () => {
      const passwordAction: AgentAction = {
        id: 'sec-8',
        action: 'type',
        selector: '#password',
        valueRef: 'LOCAL_PASSWORD',
      };

      const requires = shouldRequireConfirmation(passwordAction);
      expect(requires).toBe(true);
    });

    it('mandates confirmation when target selector intersects a sensitive region', () => {
      const clickAction: AgentAction = {
        id: 'sec-9',
        action: 'click',
        selector: '#target-div',
      };

      const sensitiveRegions: SensitiveRegion[] = [
        {
          id: 'sens-1',
          type: 'CREDIT_CARD',
          boundingBox: { x: 0, y: 0, width: 200, height: 100 },
          confidence: 0.95,
          sources: ['regex'],
        },
      ];

      const targetEl = document.getElementById('target-div')!;
      targetEl.getBoundingClientRect = () => ({
        x: 10,
        y: 10,
        left: 10,
        top: 10,
        right: 100,
        bottom: 50,
        width: 90,
        height: 40,
        toJSON: () => {},
      });

      // Sensitive region intersects target
      const requires = shouldRequireConfirmation(clickAction, sensitiveRegions);
      expect(requires).toBe(true);
    });

    it('allows benign scroll or safe button clicks without confirmation when not sensitive', () => {
      const scrollAction: AgentAction = {
        id: 'sec-10',
        action: 'scroll',
        direction: 'down',
        amount: 200,
      };

      const requires = shouldRequireConfirmation(scrollAction);
      expect(requires).toBe(false);
    });
  });

  describe('4. Fail-Closed Privacy Validation Guard', () => {
    it('blocks network payload if raw email is found in OCR text', () => {
      const payload: AnalyzeRequest = {
        sanitizedScreenshotBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        sanitizedA11yTree: [],
        sanitizedDomSkeleton: '<div></div>',
        sanitizedOcr: [
          {
            text: 'Contact us at CEO_LEAK@company.com for details',
            boundingBox: { x: 10, y: 10, width: 100, height: 20 },
            confidence: 0.9,
          },
        ],
        taskDescription: 'Summarize page',
      };

      const check = validatePayloadIsSafe(payload);
      expect(check.safe).toBe(false);
      expect(check.violations.length).toBeGreaterThan(0);
      expect(check.violations[0].type).toBe('EMAIL');
    });

    it('blocks network payload if raw Aadhaar number is found in DOM skeleton', () => {
      const payload: AnalyzeRequest = {
        sanitizedScreenshotBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        sanitizedA11yTree: [],
        sanitizedDomSkeleton: '<div id="id-display">Aadhaar: 2345 6789 0124</div>',
        sanitizedOcr: [],
        taskDescription: 'Extract identity details',
      };

      const check = validatePayloadIsSafe(payload);
      expect(check.safe).toBe(false);
      expect(check.violations.some((v) => v.type === 'AADHAAR')).toBe(true);
    });

    it('blocks network payload if raw PAN card is found in task or structural data', () => {
      const payload: AnalyzeRequest = {
        sanitizedScreenshotBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        sanitizedA11yTree: [
          {
            role: 'textbox',
            label: 'PAN is ABCDE1234F',
            selector: '#pan-input',
            boundingBox: { x: 0, y: 0, width: 50, height: 20 },
          },
        ],
        sanitizedDomSkeleton: '<div></div>',
        sanitizedOcr: [],
        taskDescription: 'Verify PAN ABCDE1234F',
      };

      const check = validatePayloadIsSafe(payload);
      expect(check.safe).toBe(false);
      expect(check.violations.some((v) => v.type === 'PAN')).toBe(true);
    });

    it('approves sanitized payload containing tokens [EMAIL], [PASSWORD], [CARD]', () => {
      const safePayload: AnalyzeRequest = {
        sanitizedScreenshotBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        sanitizedA11yTree: [
          {
            role: 'textbox',
            label: '[EMAIL]',
            selector: '#email',
            boundingBox: { x: 10, y: 20, width: 100, height: 30 },
          },
          {
            role: 'textbox',
            label: '[PASSWORD]',
            selector: '#password',
            boundingBox: { x: 10, y: 60, width: 100, height: 30 },
          },
        ],
        sanitizedDomSkeleton: '<form><input id="email" /> <input id="password" /></form>',
        sanitizedOcr: [
          {
            text: 'Welcome to login page',
            boundingBox: { x: 10, y: 0, width: 80, height: 15 },
            confidence: 0.95,
          },
        ],
        taskDescription: 'Click login button',
      };

      const check = validatePayloadIsSafe(safePayload);
      expect(check.safe).toBe(true);
      expect(check.violations.length).toBe(0);
    });
  });
});
