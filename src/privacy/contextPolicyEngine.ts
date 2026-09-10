/**
 * contextPolicyEngine.ts
 *
 * Centralized Context Policy Engine for Privacy Firewall / VeilAgent.
 *
 * Translates page context classification (AUTHENTICATION, MESSAGING, UNKNOWN, NORMAL)
 * into deterministic fail-closed policy enforcement decisions.
 *
 * Enforces the core invariant:
 * "Authentication pages and messaging applications are agent-excluded contexts.
 *  No screenshot, DOM, OCR, NER result, message content, credential, or other page
 *  information from these contexts may be transmitted to the agent backend, and no
 *  agent-generated action may execute within them."
 */

import { ContextPolicyResult } from '../core/types';
import { ContextDetector, defaultContextDetector } from './contextDetector';

export class ContextPolicyEngine {
  private detector: ContextDetector;

  constructor(detector: ContextDetector = defaultContextDetector) {
    this.detector = detector;
  }

  /**
   * Evaluates the active page context and returns the binding security policy.
   */
  evaluateContext(url?: string, doc?: Document): ContextPolicyResult {
    const detection = this.detector.detectContext(url, doc);

    switch (detection.context) {
      case 'AUTHENTICATION':
        return {
          context: 'AUTHENTICATION',
          policy: 'BLOCK_ALL',
          reason: 'AUTHENTICATION_CONTEXT',
          allowScreenshot: false,
          allowDomTransmission: false,
          allowOCRTransmission: false,
          allowAgentActions: false,
          allowCredentialResolution: false,
          confidence: detection.confidence,
          details: {
            signals: detection.signals,
          },
        };

      case 'MESSAGING':
        return {
          context: 'MESSAGING',
          policy: 'BLOCK_ALL',
          reason: 'MESSAGING_CONTEXT',
          allowScreenshot: false,
          allowDomTransmission: false,
          allowOCRTransmission: false,
          allowAgentActions: false,
          allowCredentialResolution: false,
          confidence: detection.confidence,
          details: {
            signals: detection.signals,
            matchedDomain: detection.matchedDomain,
            matchedApp: detection.matchedApp,
          },
        };

      case 'SOCIAL_MEDIA':
        return {
          context: 'SOCIAL_MEDIA',
          policy: 'BLOCK_ALL',
          reason: 'SOCIAL_MEDIA_CONTEXT',
          allowScreenshot: false,
          allowDomTransmission: false,
          allowOCRTransmission: false,
          allowAgentActions: false,
          allowCredentialResolution: false,
          confidence: detection.confidence,
          details: {
            signals: detection.signals,
            matchedDomain: detection.matchedDomain,
            matchedApp: detection.matchedApp,
          },
        };

      case 'AI_ASSISTANT':
        return {
          context: 'AI_ASSISTANT',
          policy: 'PRIVACY_SEND_GATE',
          reason: 'AI_ASSISTANT_CONTEXT',
          allowScreenshot: false,
          allowDomTransmission: false,
          allowOCRTransmission: false,
          allowAgentActions: false,
          allowCredentialResolution: false,
          confidence: detection.confidence,
          details: {
            signals: detection.signals,
            matchedDomain: detection.matchedDomain,
            matchedApp: detection.matchedApp,
          },
        };

      case 'UNKNOWN':
        // Strict fail-closed: If context cannot be established, restrict operations
        return {
          context: 'UNKNOWN',
          policy: 'RESTRICTED',
          reason: 'UNKNOWN_CONTEXT_FAIL_CLOSED',
          allowScreenshot: false,
          allowDomTransmission: false,
          allowOCRTransmission: false,
          allowAgentActions: false,
          allowCredentialResolution: false,
          confidence: detection.confidence,
          details: {
            signals: detection.signals,
          },
        };

      case 'NORMAL':
      default:
        return {
          context: 'NORMAL',
          policy: 'ALLOW_PRIVACY_PIPELINE',
          reason: 'NORMAL_PAGE_CONTEXT',
          allowScreenshot: true,
          allowDomTransmission: true,
          allowOCRTransmission: true,
          allowAgentActions: true,
          allowCredentialResolution: true,
          confidence: detection.confidence,
          details: {
            signals: detection.signals,
          },
        };
    }
  }

  /**
   * Convenience helper to check if agent operations are completely blocked.
   */
  isAgentBlocked(url?: string, doc?: Document): boolean {
    const policy = this.evaluateContext(url, doc);
    return policy.policy === 'BLOCK_ALL' || !policy.allowAgentActions;
  }
}

export const defaultContextPolicyEngine = new ContextPolicyEngine();

/**
 * Top-level convenience evaluation function.
 */
export function evaluatePageContext(url?: string, doc?: Document): ContextPolicyResult {
  return defaultContextPolicyEngine.evaluateContext(url, doc);
}
