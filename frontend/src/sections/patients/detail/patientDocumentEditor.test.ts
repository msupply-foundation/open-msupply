import { createComputed, createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The Details tab's editor on the document path: a patient with no document
 * yet gets its first one on Save, and the screen then re-reads the patient,
 * which now carries that document and its draft. The form must stay ready
 * through that re-read, or the screen takes the form down and mounts a new
 * one (sdk-contract § Props update in place, OMS-REG-PLG-05.10). The GraphQL
 * edge is mocked; AJV and the base schemas run for real.
 */

const graphqlFetch = vi.fn();
vi.mock('../../../api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
  describeErrors: () => 'refused',
}));
vi.mock('../../../domain/patient/patientResource', () => ({
  searchLocalPatients: async () => [],
}));
vi.mock('../../../store/storeContext', () => ({
  hasPermission: () => true,
  currentStoreName: () => 'Store',
  // What the plugin slot context reads, for the document form's versioning.
  storeContext: () => undefined,
  currentStoreId: () => 'store',
  currentStoreCode: () => undefined,
  currentStoreMode: () => undefined,
}));
// The library's fields reach for `window`; the host needs only its validator
// and base schemas, which run in node.
vi.mock('../../../domain/documentForm/formLibrary', async () => ({
  validateDocument: (await import('../../../domain/documentForm/validation'))
    .validateDocument,
  baseSchemaFor: (await import('../../../domain/documentForm/baseSchemas'))
    .baseSchemaFor,
}));

import { createPatientDocumentEditor } from './patientDocumentEditor';
import {
  FormDocumentByName,
  InsertFormPatient,
} from '../../../domain/documentForm/documentForm.generated';
import type { PatientNode } from './patientDetails';

const registry = {
  __typename: 'DocumentRegistryNode' as const,
  id: 'patient-registry',
  documentType: 'Patient',
  category: 'PATIENT' as const,
  contextId: 'Patient',
  name: 'Patient',
  formSchemaId: 'deployment-patient-v1',
  jsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      id: { type: 'string' },
      code: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
    },
  },
};

const node = (overrides: Partial<PatientNode> = {}): PatientNode => ({
  id: 'patient-1',
  name: 'Demo, Alex',
  code: 'CF0002',
  code2: null,
  firstName: 'Alex',
  lastName: 'Demo',
  gender: null,
  dateOfBirth: null,
  age: null,
  phone: null,
  address1: null,
  address2: null,
  country: null,
  email: null,
  website: null,
  isDeceased: false,
  dateOfDeath: null,
  nextOfKinId: null,
  nextOfKinName: null,
  createdDatetime: null,
  customFields: null,
  nextOfKin: null,
  document: null,
  ...overrides,
});

const savedDocument = (data: unknown) => ({
  __typename: 'DocumentNode' as const,
  id: 'doc-1',
  name: 'patients/patient-1',
  type: 'Patient',
  data,
  schema: {
    __typename: 'JsonschemaNode' as const,
    id: registry.formSchemaId,
    jsonSchema: {},
  },
  documentRegistry: registry,
});

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  graphqlFetch.mockReset();
});

describe("a patient's first document on the Details tab", () => {
  it('keeps the form ready through the re-read that brings the saved document (OMS-REG-PLG-05.10)', async () => {
    let saved: unknown;
    graphqlFetch.mockImplementation(
      async (query: unknown, variables: { input?: { data: unknown } }) => {
        if (query === InsertFormPatient) {
          saved = variables.input?.data;
          return {
            kind: 'success',
            data: {
              insertProgramPatient: {
                id: 'patient-1',
                document: savedDocument(saved),
              },
            },
          };
        }
        throw new Error('unexpected query');
      }
    );

    const statuses: string[] = [];
    let setNode!: (n: PatientNode) => void;
    const editor = createRoot(d => {
      dispose = d;
      const [current, set] = createSignal<PatientNode>(node());
      setNode = set;
      const editor = createPatientDocumentEditor({
        storeId: () => 'store',
        node: current,
        registry: () => registry,
      });
      createComputed(() => statuses.push(editor.form.status()));
      return editor;
    });

    await vi.waitFor(() => expect(editor.form.status()).toBe('ready'), {
      timeout: 5000,
    });
    editor.form.draft.set('firstName', 'Alexa');
    await editor.doSave();
    expect(saved).toMatchObject({ firstName: 'Alexa' });

    // The screen re-reads the patient, which now carries its document and
    // the draft an edit starts from; the form reads nothing itself.
    statuses.length = 0;
    setNode({
      ...node({ firstName: 'Alexa' }),
      documentDraft: saved,
      document: savedDocument(saved),
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(editor.form.status()).toBe('ready');
    expect(editor.form.document()?.id).toBe('doc-1');
    expect(editor.form.draft.data.firstName).toBe('Alexa');
    expect(
      graphqlFetch.mock.calls.some(([q]) => q === FormDocumentByName)
    ).toBe(false);
    // Never down to idle or loading, which would remount the form.
    expect(statuses.every(s => s === 'ready')).toBe(true);
  });
});
