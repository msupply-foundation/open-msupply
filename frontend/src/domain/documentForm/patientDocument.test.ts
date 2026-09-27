import { createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import patientSchema from '../../../plugins/examples/demo_program/forms/Patient/v1.json';

/*
 * A patient document through the form host (kdd/custom-forms/specs.md §
 * Host-owned surfaces, Patient; implementation-plan H9): a patient with no
 * document gets one on its first save by insert, a saved one is edited from
 * the source's seed (the server's documentDraft) and saved as the next
 * version, and after a save the form stands on the version it saved. The
 * GraphQL edge is mocked; AJV and the base schemas run for real.
 */

const graphqlFetch = vi.fn();
vi.mock('../../api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
  describeErrors: () => 'refused',
}));

// The library's fields reach for `window`; the host needs only its validator
// and base schemas, which run in node.
vi.mock('./formLibrary', async () => ({
  validateDocument: (await import('./validation')).validateDocument,
  baseSchemaFor: (await import('./baseSchemas')).baseSchemaFor,
}));

import {
  createDocumentForm,
  type DocumentFormSource,
} from './createDocumentForm';
import {
  FormDocumentByName,
  InsertFormPatient,
  UpdateFormPatient,
  type FormDocumentFragment,
} from './documentForm.generated';
import type { Patient } from '../../plugin-sdk/documents';
import type { FieldError } from '../../ui/layout/Form/formValidation';

const SCHEMA = 'demo_program_Patient_v1_test';
const NAME = 'p/patient-1/Patient';

const registry = {
  __typename: 'DocumentRegistryNode' as const,
  id: 'patient-registry',
  documentType: 'Patient',
  category: 'PATIENT' as const,
  contextId: 'Patient',
  name: 'Patient',
  formSchemaId: SCHEMA,
  jsonSchema: patientSchema,
};

let versions = 0;
const version = (data: unknown): FormDocumentFragment =>
  ({
    __typename: 'DocumentNode',
    id: `patient-doc-${++versions}`,
    name: NAME,
    type: 'Patient',
    data,
    schema: { __typename: 'JsonschemaNode', id: SCHEMA, jsonSchema: {} },
    documentRegistry: registry,
  }) as FormDocumentFragment;

const nameRow: Patient = {
  id: 'patient-1',
  code: 'CF0002',
  firstName: 'Alex',
  lastName: 'Demo',
};

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  graphqlFetch.mockReset();
});

const mockServer = (stored?: FormDocumentFragment) =>
  graphqlFetch.mockImplementation(
    async (query: unknown, variables: { input: { data: unknown } }) => {
      if (query === FormDocumentByName) {
        return { kind: 'success', data: { document: stored ?? null } };
      }
      if (query === InsertFormPatient || query === UpdateFormPatient) {
        const saved = version(variables.input.data);
        const key =
          query === InsertFormPatient
            ? 'insertProgramPatient'
            : 'updateProgramPatient';
        return {
          kind: 'success',
          data: { [key]: { id: 'patient-1', document: saved } },
        };
      }
      throw new Error('unexpected query');
    }
  );

const open = async (
  initial: DocumentFormSource,
  extraErrors?: () => FieldError[]
) => {
  let setSource!: (source: DocumentFormSource) => void;
  const form = createRoot(d => {
    dispose = d;
    const [source, set] = createSignal<DocumentFormSource>(initial);
    setSource = set;
    return createDocumentForm<Patient>({
      storeId: () => 'store',
      patientId: () => 'patient-1',
      source,
      extraErrors,
    });
  });
  await vi.waitFor(() => expect(form.status()).toBe('ready'), {
    timeout: 5000,
  });
  return { form, setSource };
};

const lastCall = () =>
  graphqlFetch.mock.calls.at(-1) as [
    unknown,
    { input: { data: unknown; schemaId: string; parent?: string } },
  ];

describe('a patient with no document', () => {
  it('opens pristine from the name row and saves its first document by insert', async () => {
    mockServer();
    const { form } = await open({ kind: 'new', registry, data: nameRow });
    expect(form.isDirty()).toBe(false);
    expect(form.draft.data.firstName).toBe('Alex');

    form.draft.set('code', 'GRY-K7Q-0001');
    const saved = await form.save();
    const [query, variables] = lastCall();
    expect(query).toBe(InsertFormPatient);
    expect(variables.input).toEqual({
      data: { ...nameRow, code: 'GRY-K7Q-0001' },
      schemaId: SCHEMA,
    });
    expect(form.document()).toBe(saved);
    expect(form.isDirty()).toBe(false);
  });

  it('stays on the saved version when the screen re-reads the patient', async () => {
    mockServer();
    const { form, setSource } = await open({
      kind: 'new',
      registry,
      data: nameRow,
    });
    form.draft.set('code', 'GRY-K7Q-0001');
    const saved = await form.save();

    // The re-read patient now has a document, with the saved data.
    setSource({ kind: 'existing', name: NAME, seed: saved?.data as object });
    expect(form.status()).toBe('ready');
    expect(form.document()).toBe(saved);
    expect(form.draft.data.code).toBe('GRY-K7Q-0001');

    form.draft.set('code2', 'NHN-1');
    await form.save();
    const [query, variables] = lastCall();
    expect(query).toBe(UpdateFormPatient);
    expect(variables.input.parent).toBe(saved?.id);
  });
});

describe('a patient with a document', () => {
  it("is edited from the source's seed, and saved as the next version", async () => {
    const stored = version({ ...nameRow, phone: 'stale' });
    mockServer(stored);
    // The seed is the server's documentDraft: the stored version with the
    // name row's later changes merged in.
    const seed = { ...nameRow, lastName: 'Demo-Smith' };
    const { form } = await open({ kind: 'existing', name: NAME, seed });
    expect(form.draft.data.lastName).toBe('Demo-Smith');
    expect(form.isDirty()).toBe(false);

    form.draft.set('code2', 'NHN-1');
    await form.save();
    const [query, variables] = lastCall();
    expect(query).toBe(UpdateFormPatient);
    expect(variables.input.parent).toBe(stored.id);
    expect(variables.input.data).toEqual({ ...seed, code2: 'NHN-1' });
  });

  it('stands on the version it saved, not the seed it opened with', async () => {
    mockServer(version(nameRow));
    const { form } = await open({
      kind: 'existing',
      name: NAME,
      seed: nameRow,
    });
    form.draft.set('code', 'GRY-K7Q-0002');
    await form.save();
    expect(form.draft.data.code).toBe('GRY-K7Q-0002');
    expect(form.isDirty()).toBe(false);
  });

  it('checks the base fields against the base Patient schema', async () => {
    mockServer(version(nameRow));
    const { form } = await open({ kind: 'existing', name: NAME });
    form.draft.set('dateOfBirth', 'not a date');
    expect(await form.save()).toBeUndefined();
    expect(form.draft.errorFor('dateOfBirth')).toBeDefined();
    expect(graphqlFetch).toHaveBeenCalledTimes(1);
  });

  it("shows and counts the screen's own failures with the draft's", async () => {
    mockServer(version(nameRow));
    const [taken, setTaken] = createSignal(false);
    const codeErrors = (): FieldError[] => [
      { id: 'code', label: 'Code', failed: taken(), message: 'Duplicated' },
    ];
    // The form host reads it inside its own validation memo.
    // eslint-disable-next-line solid/reactivity
    const { form } = await open({ kind: 'existing', name: NAME }, codeErrors);
    expect(form.validation.valid()).toBe(true);
    setTaken(true);
    expect(form.validation.valid()).toBe(false);
    expect(form.draft.errorFor('code')).toBe('Duplicated');
  });
});
