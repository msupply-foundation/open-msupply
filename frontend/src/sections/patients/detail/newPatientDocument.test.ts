import { createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The create wizard's last step on the document path (spec/patients › effects
 * of creation, OMS-REG-DIS-01.31/.33): a new patient's first document, seeded
 * from the first step, validated against the installed schema and written by
 * insert, pinned to the registry entry's schema. The GraphQL edge and the
 * patient search are mocked; AJV and the base schemas run for real.
 */

const graphqlFetch = vi.fn();
vi.mock('../../../api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
  describeErrors: () => 'refused',
}));
const searchLocalPatients = vi.fn();
vi.mock('../../../domain/patient/patientResource', () => ({
  searchLocalPatients: (...args: unknown[]) => searchLocalPatients(...args),
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

import { createNewPatientDocumentEditor } from './patientDocumentEditor';
import { InsertFormPatient } from '../../../domain/documentForm/documentForm.generated';
import type { Patient } from '../../../plugin-sdk/documents';

// A deployment's Patient type with an optional code that is six digits when
// present.
const jsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  allOf: [{ $ref: '#/definitions/CodedPatient' }],
  definitions: {
    CodedPatient: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        code: { type: 'string', pattern: '^[0-9]{6}$' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
      },
      required: ['firstName', 'id', 'lastName'],
    },
  },
};

const registry = {
  __typename: 'DocumentRegistryNode' as const,
  id: 'patient-registry',
  documentType: 'Patient',
  category: 'PATIENT' as const,
  contextId: 'Patient',
  name: 'Patient',
  formSchemaId: 'deployment-patient-v1',
  jsonSchema,
};

const seed: Patient = {
  id: 'patient-new',
  firstName: 'Amina',
  lastName: 'Ali',
};

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  graphqlFetch.mockReset();
  searchLocalPatients.mockReset();
});

const mockServer = () =>
  graphqlFetch.mockImplementation(
    async (query: unknown, variables: { input: { data: unknown } }) => {
      if (query !== InsertFormPatient) throw new Error('unexpected query');
      return {
        kind: 'success',
        data: {
          insertProgramPatient: {
            id: 'patient-new',
            document: {
              __typename: 'DocumentNode',
              id: 'doc-1',
              name: 'patients/patient-new',
              type: 'Patient',
              data: variables.input.data,
              schema: {
                __typename: 'JsonschemaNode',
                id: registry.formSchemaId,
                jsonSchema: {},
              },
              documentRegistry: registry,
            },
          },
        },
      };
    }
  );

const open = async () => {
  let setSeed!: (seed: Patient | undefined) => void;
  const editor = createRoot(d => {
    dispose = d;
    const [current, set] = createSignal<Patient>();
    setSeed = set;
    return createNewPatientDocumentEditor({
      storeId: () => 'store',
      patientId: () => 'patient-new',
      registry: () => registry,
      seed: current,
    });
  });
  return { editor, setSeed };
};

const inserts = () =>
  graphqlFetch.mock.calls.filter(([query]) => query === InsertFormPatient);

describe('a new patient on the document path', () => {
  it('waits for the wizard to reach it, then writes its first document by insert', async () => {
    mockServer();
    searchLocalPatients.mockResolvedValue([]);
    const { editor, setSeed } = await open();
    expect(editor.form.status()).toBe('idle');

    setSeed(seed);
    await vi.waitFor(() => expect(editor.form.status()).toBe('ready'), {
      timeout: 5000,
    });
    expect(await editor.create()).toBe(true);
    expect(inserts()).toHaveLength(1);
    expect(inserts()[0]?.[1]).toEqual({
      storeId: 'store',
      input: { data: seed, schemaId: 'deployment-patient-v1' },
    });
  });

  it('needs no code where the schema does not require one', async () => {
    mockServer();
    const { editor, setSeed } = await open();
    setSeed(seed);
    await vi.waitFor(() => expect(editor.form.status()).toBe('ready'), {
      timeout: 5000,
    });
    expect(editor.form.draft.schemaFor('code')?.required).toBe(false);
    expect(await editor.create()).toBe(true);
    expect(searchLocalPatients).not.toHaveBeenCalled();
  });

  it('writes nothing while a value fails the installed schema', async () => {
    mockServer();
    const { editor, setSeed } = await open();
    setSeed(seed);
    await vi.waitFor(() => expect(editor.form.status()).toBe('ready'), {
      timeout: 5000,
    });
    editor.form.draft.set('code', 'GRY0001');
    expect(await editor.create()).toBe(false);
    expect(editor.form.draft.errorFor('code')).toBeDefined();
    expect(inserts()).toEqual([]);
  });

  it('writes nothing while another patient holds the code', async () => {
    mockServer();
    searchLocalPatients.mockResolvedValue([{ id: 'someone-else' }]);
    const { editor, setSeed } = await open();
    setSeed(seed);
    await vi.waitFor(() => expect(editor.form.status()).toBe('ready'), {
      timeout: 5000,
    });
    editor.form.draft.set('code', '112334');
    expect(await editor.create()).toBe(false);
    expect(searchLocalPatients).toHaveBeenCalledWith('store', {
      code: '112334',
    });
    expect(inserts()).toEqual([]);
  });
});
