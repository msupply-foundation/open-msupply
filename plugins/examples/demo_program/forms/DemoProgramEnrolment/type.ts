/*
 * The demo program's enrolment document: the base ProgramEnrolment plus the
 * program's own fields under `extension.demo`.
 *
 * The JSDoc blocks are schema content: ts-json-schema-generator emits them as
 * `description` and `@format` (scripts/emit-form-schemas.mjs).
 */
import type { ProgramEnrolment } from '@openmsupply/plugin-sdk';

export type DemoReferralSource = 'SELF' | 'CLINIC' | 'HOSPITAL' | 'COMMUNITY';

export interface DemoProgramEnrolmentExtension {
  /** Where the patient was referred to the program from */
  referredFrom?: DemoReferralSource;
  /** Free-text notes taken at enrolment */
  enrolmentNotes?: string;
}

export interface DemoProgramEnrolment extends ProgramEnrolment {
  extension?: {
    demo?: DemoProgramEnrolmentExtension;
  };
}
