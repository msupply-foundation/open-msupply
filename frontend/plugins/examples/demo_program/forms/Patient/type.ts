/*
 * The demo program's Patient document: the base Patient plus the program's
 * own fields under `extension.demo`. The document type is exactly `Patient`
 * because the server hard-codes that name for patients, so installing this
 * plugin takes over the deployment's patient entry (`--take-over Patient`).
 *
 * The JSDoc blocks are schema content: ts-json-schema-generator emits them as
 * `description` and `@format` (scripts/emit-form-schemas.mjs).
 */
import type { Patient } from '@openmsupply/plugin-sdk';

export type DemoPreferredLanguage = 'ENGLISH' | 'FRENCH' | 'SPANISH' | 'OTHER';

export interface DemoPatientExtension {
  /** The person who supports the patient with their treatment */
  treatmentSupporter?: string;
  /** The language the patient prefers to be spoken to in */
  preferredLanguage?: DemoPreferredLanguage;
}

export interface DemoPatient extends Patient {
  extension?: {
    demo?: DemoPatientExtension;
  };
}
