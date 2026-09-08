/**
 * actionExecutor.test.ts
 *
 * Tests for Local Action Executor:
 * - Rejection of arbitrary code and malicious selectors
 * - Verification of target elements
 * - Local token resolution (LOCAL_EMAIL, LOCAL_PASSWORD)
 * - Safe DOM event dispatching
 */

import { ActionExecutor } from '../actions/actionExecutor';
import { AgentAction } from '../core/types';

describe('ActionExecutor Engine', () => {
  let executor: ActionExecutor;

  beforeEach(() => {
    document.body.innerHTML = '';
    executor = new ActionExecutor({
      LOCAL_EMAIL: 'agent.test@sih.gov.in',
      LOCAL_PASSWORD: 'supersecretpass',
    });
  });

  it('rejects unsupported actions not in the allowed schema', async () => {
    const invalidAction = { action: 'eval', selector: '#box' } as unknown as AgentAction;
    const result = await executor.execute(invalidAction);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported action type');
  });

  it('rejects malicious javascript: URLs in selector', async () => {
    const maliciousAction: AgentAction = {
      action: 'click',
      selector: 'javascript:alert(1)',
    };
    const result = await executor.execute(maliciousAction);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Malicious pattern detected');
  });

  it('resolves LOCAL_EMAIL token without leaking raw credentials from server', async () => {
    const input = document.createElement('input');
    input.id = 'email-field';
    // Mock getBoundingClientRect
    input.getBoundingClientRect = () => ({
      x: 10, y: 10, width: 200, height: 35, top: 10, left: 10, right: 210, bottom: 45, toJSON: () => {},
    });
    document.body.appendChild(input);

    const typeAction: AgentAction = {
      action: 'type',
      selector: '#email-field',
      valueRef: 'LOCAL_EMAIL',
    };

    const result = await executor.execute(typeAction);
    expect(result.success).toBe(true);
    expect(input.value).toBe('agent.test@sih.gov.in');
  });

  it('fails gracefully when target element does not exist', async () => {
    const clickAction: AgentAction = {
      action: 'click',
      selector: '#non-existent-button',
    };
    const result = await executor.execute(clickAction);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Element not found');
  });

  it('successfully executes click on target button', async () => {
    const button = document.createElement('button');
    button.id = 'test-btn';
    button.getBoundingClientRect = () => ({
      x: 10, y: 50, width: 100, height: 40, top: 50, left: 10, right: 110, bottom: 90, toJSON: () => {},
    });

    let clicked = false;
    button.addEventListener('click', () => {
      clicked = true;
    });
    document.body.appendChild(button);

    const clickAction: AgentAction = {
      action: 'click',
      selector: '#test-btn',
    };

    const result = await executor.execute(clickAction);
    expect(result.success).toBe(true);
    expect(clicked).toBe(true);
  });

  it('executes wait action within allowed boundaries', async () => {
    const waitAction: AgentAction = {
      action: 'wait',
      value: '50',
    };

    const t0 = Date.now();
    const result = await executor.execute(waitAction);
    const elapsed = Date.now() - t0;

    expect(result.success).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});
