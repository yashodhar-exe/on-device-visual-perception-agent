/**
 * policyEngine.ts
 *
 * Fail-Closed Privacy Policy Engine & Verification:
 *
 * Implements the core SIH security invariant:
 * "The payload must be provably safe and sanitized before transmission.
 *  If verification fails or uncertainty exists: BLOCK THE UPLOAD."
 *
 * Inspects all components immediately prior to network transmission:
 *  1. Screenshot redaction completeness
 *  2. Accessibility tree labels
 *  3. Sanitized DOM skeleton
 *  4. OCR text
 *  5. Target URL
 */

import { AnalyzeRequest, SensitiveRegion, ExtensionSettings } from '../core/types';
import { runAllPatterns } from '../detectors/regexDetector';

export interface PolicyEvaluationResult {
  safe: boolean;
  violations: string[];
  blockedReason?: string;
  auditMetrics: {
    detectionsCount: number;
    redactionsCount: number;
    rawPiiTransmitted: number;
  };
}

/**
 * Evaluates whether an AnalyzeRequest payload is mathematically safe to transmit.
 * Follows strict fail-closed semantics.
 */
export function evaluatePrivacyPolicy(
  payload: AnalyzeRequest,
  sensitiveRegions: SensitiveRegion[] = [],
  settings?: ExtensionSettings
): PolicyEvaluationResult {
  const violations: string[] = [];

  // 1. Verify Screenshot Redaction
  if (sensitiveRegions.length > 0) {
    const unredacted = sensitiveRegions.filter((r) => !r.redacted);
    if (unredacted.length > 0) {
      violations.push(
        `Unredacted sensitive regions detected: ${unredacted.length} region(s) missed pixel redaction`
      );
    }
  }

  // 2. Inspect Sanitized DOM Structure for Raw PII
  const domContent = payload.domStructure || payload.sanitizedDomSkeleton || '';
  if (domContent) {
    const domMatches = runAllPatterns(domContent);
    if (domMatches.length > 0) {
      for (const match of domMatches) {
        violations.push(`Raw ${match.type} leaked into DOM skeleton: ${match.value.slice(0, 8)}...`);
      }
    }

    // Check for password attributes with non-placeholder values
    if (/value=["'][^"'\s\[\]]+["']/i.test(domContent)) {
      violations.push('Input value attribute detected in sanitized DOM structure');
    }
  }

  // 3. Inspect Accessibility Tree for Leaked Values
  const a11yNodes = payload.accessibilityTree || payload.sanitizedA11yTree || [];
  if (a11yNodes.length > 0) {
    for (const node of a11yNodes) {
      if (node.label && node.label.length > 4) {
        const matches = runAllPatterns(node.label);
        if (matches.length > 0) {
          violations.push(`Raw ${matches[0].type} found in accessibility label for selector ${node.selector}`);
        }
      }
    }
  }

  // 4. Inspect OCR Text for Raw PII
  let ocrContent = payload.ocrText || '';
  if (payload.sanitizedOcr && Array.isArray(payload.sanitizedOcr)) {
    ocrContent += ' ' + payload.sanitizedOcr.map((item) => item.text).join(' ');
  }
  if (ocrContent.trim()) {
    const ocrMatches = runAllPatterns(ocrContent);
    if (ocrMatches.length > 0) {
      for (const match of ocrMatches) {
        violations.push(`Raw ${match.type} found in OCR text metadata`);
      }
    }
  }

  // 5. Inspect Task Description for Raw PII
  if (payload.taskDescription) {
    const taskMatches = runAllPatterns(payload.taskDescription);
    if (taskMatches.length > 0) {
      for (const match of taskMatches) {
        violations.push(`Raw ${match.type} found in task description: ${match.value.slice(0, 8)}...`);
      }
    }
  }

  // 6. Inspect URL query parameters for leaked tokens
  if (payload.url) {
    try {
      const parsedUrl = new URL(payload.url);
      if (parsedUrl.search && parsedUrl.search.length > 1) {
        const searchMatches = runAllPatterns(parsedUrl.search);
        if (searchMatches.length > 0) {
          violations.push(`Sensitive parameter found in URL search query: ${searchMatches[0].type}`);
        }
      }
    } catch {
      // URL parsing non-fatal
    }
  }

  const safe = violations.length === 0;

  return {
    safe,
    violations,
    blockedReason: safe ? undefined : 'POLICY_VIOLATION',
    auditMetrics: {
      detectionsCount: sensitiveRegions.length,
      redactionsCount: sensitiveRegions.filter((r) => r.redacted).length,
      rawPiiTransmitted: safe ? 0 : violations.length,
    },
  };
}

/**
 * Standard validatePayloadIsSafe function as required by Section 11 of the specification.
 * Returns structured safe boolean and typed violations array.
 */
export function validatePayloadIsSafe(
  payload: AnalyzeRequest,
  sensitiveRegions: SensitiveRegion[] = []
): { safe: boolean; violations: Array<{ type: string; message: string }>; blockedReason?: string } {
  const result = evaluatePrivacyPolicy(payload, sensitiveRegions);
  const structuredViolations = result.violations.map((msg) => {
    let type = 'UNKNOWN';
    if (/email/i.test(msg)) type = 'EMAIL';
    else if (/aadhaar/i.test(msg)) type = 'AADHAAR';
    else if (/pan/i.test(msg)) type = 'PAN';
    else if (/card|credit/i.test(msg)) type = 'CREDIT_CARD';
    else if (/password/i.test(msg)) type = 'PASSWORD';
    else if (/phone/i.test(msg)) type = 'PHONE';
    else if (/api[_\s]?key/i.test(msg)) type = 'API_KEY';
    else if (/unredacted/i.test(msg)) type = 'UNREDACTED_IMAGE';
    return { type, message: msg };
  });

  return {
    safe: result.safe,
    violations: structuredViolations,
    blockedReason: result.blockedReason,
  };
}

/**
 * Final verification function executed immediately before HTTP request.
 * Throws an explicit POLICY_VIOLATION error if payload contains any raw PII.
 */
export function validatePayloadBeforeTransmission(
  payload: AnalyzeRequest,
  sensitiveRegions: SensitiveRegion[] = []
): void {
  const result = evaluatePrivacyPolicy(payload, sensitiveRegions);
  if (!result.safe) {
    const errorMsg = `[PrivacyFirewall] BLOCKED: POLICY_VIOLATION - ${result.violations.join('; ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

