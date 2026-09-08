/**
 * actionTypes.ts
 *
 * Types for the Browser Vision Agent Action Engine.
 */

import { AgentAction, ActionResult, SensitiveRegion } from '../core/types';

export type { AgentAction, ActionResult, SensitiveRegion };

export interface ActionExecutionOptions {
  requireConfirmationForSensitive?: boolean;
  localCredentialStore?: Record<string, string>;
  onConfirmationRequired?: (action: AgentAction) => Promise<boolean>;
}
