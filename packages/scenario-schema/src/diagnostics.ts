import type { Scenario } from './schema.js';

export type DiagnosticCode =
  | 'INVALID_JSON' | 'INPUT_LIMIT' | 'INVALID_STRUCTURE'
  | 'DUPLICATE_NODE_ID' | 'DUPLICATE_CHOICE_ID' | 'DUPLICATE_SOURCE_ID' | 'DUPLICATE_DELAYED_ID'
  | 'ENTRY_NOT_FOUND' | 'TARGET_NOT_FOUND' | 'TOO_FEW_CHOICES' | 'UNREACHABLE_NODE'
  | 'CYCLE' | 'DEAD_END' | 'NO_REACHABLE_ENDING' | 'TOO_SHORT_PATH'
  | 'SOURCE_NOT_FOUND' | 'SOURCE_METADATA_INCOMPLETE' | 'SOURCE_UNVERIFIED'
  | 'SOURCE_DATE_CONFLICT' | 'SOURCE_CLASSIFICATION_CONFLICT' | 'SOURCE_RELEVANCE_MISSING' | 'SOURCE_EVIDENCE_MISSING' | 'SOURCE_APPLICABILITY_UNCONFIRMED' | 'SOURCE_ATTRIBUTION_ADVICE' | 'DUPLICATE_SOURCE_REFERENCE'
  | 'REVIEW_INCOMPLETE' | 'PUBLICATION_NOT_ALLOWED' | 'LEGAL_SOURCE_REQUIRED'
  | 'DELAYED_TARGET_NOT_FOUND' | 'DELAYED_TRIGGER_UNREACHABLE' | 'DELAYED_MAY_NOT_FIRE';

export interface ValidationIssue {
  code: DiagnosticCode;
  path: (string | number)[];
  message: string;
  nodeId?: string;
  severity?: 'ERROR' | 'WARNING' | 'INFO';
}

export type ValidationResult =
  | { success: true; data: Scenario; errors: []; warnings: ValidationIssue[] }
  | { success: false; errors: ValidationIssue[]; warnings: ValidationIssue[] };

export function issue(code: DiagnosticCode, path: (string | number)[], message: string, nodeId?: string): ValidationIssue {
  return nodeId === undefined ? { code, path, message } : { code, path, message, nodeId };
}
