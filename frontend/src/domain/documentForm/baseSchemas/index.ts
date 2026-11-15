/*
 * The base document types' schemas, emitted from src/plugin-sdk/documents.ts
 * by `pnpm forms:emit` and kept current by `pnpm forms:check`
 * (vite/formPlugins.ts `emitBaseSchemas`). The server reads a document's base
 * fields on its own terms, whatever its registry entry's schema says, so the
 * host checks every draft against its category's base schema too: a thin or
 * legacy registry schema cannot let through a base field the server would
 * then refuse. Part of the form library's lazy chunk.
 */
import type { FormRegistryFragment } from '../documentForm.generated';
import type { DraftSchema } from '../draft';
import type { JsonSchema } from '../schemaNode';
import contactTrace from './ContactTrace.json';
import encounter from './Encounter.json';
import patient from './Patient.json';
import programEnrolment from './ProgramEnrolment.json';

// Validator cache keys. No form-schema id takes this shape: install writes
// `<plugin>_<type>_v<n>_<hash>`, and legacy rows carry uuids.
const BASE_SCHEMAS: Partial<
  Record<FormRegistryFragment['category'], DraftSchema>
> = {
  PATIENT: { id: 'base:Patient', jsonSchema: patient as JsonSchema },
  PROGRAM_ENROLMENT: {
    id: 'base:ProgramEnrolment',
    jsonSchema: programEnrolment as JsonSchema,
  },
  ENCOUNTER: { id: 'base:Encounter', jsonSchema: encounter as JsonSchema },
  CONTACT_TRACE: {
    id: 'base:ContactTrace',
    jsonSchema: contactTrace as JsonSchema,
  },
};

/** The base schema for a category; undefined for Custom, which has none. */
export const baseSchemaFor = (
  category: FormRegistryFragment['category']
): DraftSchema | undefined => BASE_SCHEMAS[category];
