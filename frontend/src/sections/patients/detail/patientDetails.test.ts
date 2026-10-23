import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * Which path a patient's details save through (spec/patients rules › two
 * persistence paths), as the patient screen's Details tab and the picker's
 * edit modal both decide it: the store's Patient registry entry, and nothing
 * else — and the patient read that follows from it (spec/patients contract ›
 * document path, reading): with the document and its draft on the document
 * path, the record alone on the plain path. The registry read is mocked; the
 * editors are the real ones.
 */

const fetchPatientRegistry = vi.fn();
const rememberedPatientRegistry = vi.fn();
vi.mock('./programs/programsApi', () => ({
  fetchPatientRegistry: (storeId: string) => fetchPatientRegistry(storeId),
  rememberedPatientRegistry: (storeId: string) =>
    rememberedPatientRegistry(storeId),
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
const graphqlFetch = vi.fn<
  (query: unknown, variables?: unknown) => Promise<unknown>
>(async () => ({ kind: 'transportError' }));
vi.mock('../../../api/graphql', () => ({
  graphqlFetch: (query: unknown, variables?: unknown) =>
    graphqlFetch(query, variables),
  describeErrors: () => '',
}));
// The library's fields reach for `window`; the host needs only its validator
// and base schemas, which run in node.
vi.mock('../../../domain/documentForm/formLibrary', async () => ({
  validateDocument: (await import('../../../domain/documentForm/validation'))
    .validateDocument,
  baseSchemaFor: (await import('../../../domain/documentForm/baseSchemas'))
    .baseSchemaFor,
}));

import {
  createPatientDetails,
  type PatientDetails,
  type PatientNode,
} from './patientDetails';
import { Patient, PatientWithDocument } from './patient.generated';

const patientRegistry = {
  __typename: 'DocumentRegistryNode' as const,
  id: 'patient-registry',
  documentType: 'Patient',
  category: 'PATIENT' as const,
  contextId: 'Patient',
  name: 'Patient',
  formSchemaId: 'patient-schema',
  jsonSchema: {},
};

/** The plain path's read of a patient (that happens to have a document). */
const record: PatientNode = {
  id: 'patient-1',
  name: 'Demo, Alex',
  code: 'CF0002',
  code2: null,
  firstName: 'Alex',
  lastName: 'Demo',
  gender: 'MALE',
  dateOfBirth: '1979-11-03',
  age: 46,
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
  document: {
    __typename: 'DocumentNode',
    id: 'doc-1',
    name: 'p/patient-1/Patient',
  },
};

/** The document path's read of the same patient. */
const withDocument: PatientNode = {
  ...record,
  documentDraft: { firstName: 'Alex', lastName: 'Demo' },
  document: {
    __typename: 'DocumentNode',
    id: 'doc-1',
    name: 'p/patient-1/Patient',
    type: 'Patient',
    data: { firstName: 'Alex', lastName: 'Demo' },
    schema: {
      __typename: 'JsonschemaNode',
      id: 'patient-schema',
      jsonSchema: {},
    },
    documentRegistry: patientRegistry,
  },
};

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  fetchPatientRegistry.mockReset();
  rememberedPatientRegistry.mockReset();
  graphqlFetch.mockReset();
  graphqlFetch.mockImplementation(async () => ({ kind: 'transportError' }));
});

const patientReads = () =>
  graphqlFetch.mock.calls
    .filter(([q]) => q === Patient || q === PatientWithDocument)
    .map(([q]) => q);

/** Answers each patient read with the node it carries. */
const answerPatient = () =>
  graphqlFetch.mockImplementation(async (query: unknown) => {
    if (query === Patient) {
      return { kind: 'success', data: { patient: record } };
    }
    if (query === PatientWithDocument) {
      return { kind: 'success', data: { patient: withDocument } };
    }
    return { kind: 'transportError' };
  });

const create = (): PatientDetails =>
  createRoot(d => {
    dispose = d;
    return createPatientDetails({
      storeId: () => 'store',
      patientId: () => 'patient-1',
    });
  });

const open = async (
  entry: typeof patientRegistry | undefined
): Promise<PatientDetails> => {
  fetchPatientRegistry.mockResolvedValue({ entry });
  answerPatient();
  const details = create();
  await vi.waitFor(() => expect(details.registry()).toBeDefined());
  await vi.waitFor(() => expect(details.node()).toBeDefined());
  return details;
};

describe('createPatientDetails', () => {
  it('saves through the patient document on a store with a Patient entry', async () => {
    const details = await open(patientRegistry);
    expect(details.onDocumentPath()).toBe(true);
    expect(details.active()).toBe(details.documentEditor);
  });

  it('saves through the patient record on a store without one', async () => {
    const details = await open(undefined);
    expect(details.onDocumentPath()).toBe(false);
    expect(details.active()).toBe(details.editor);
  });

  it('decides nothing until the registry is answered', async () => {
    fetchPatientRegistry.mockReturnValue(new Promise(() => {}));
    const details = create();
    expect(details.registry()).toBeUndefined();
    expect(details.canSave()).toBe(false);
  });

  // The read's shape follows the path: the document and its draft come with
  // the patient on the document path, in the one read the Details tab's form
  // then opens from. The plain path's read never carries the draft, as
  // building it parses the stored document: one the server cannot read must
  // not keep the patient from opening on a store that never edits it.
  describe('the patient read', () => {
    it('carries the document and its draft on the document path', async () => {
      const details = await open(patientRegistry);
      await vi.waitFor(() => expect(details.node()).toBe(withDocument));
      // The record first, then with the document once the registry answered.
      expect(patientReads()).toEqual([Patient, PatientWithDocument]);
      // The form opens from that read, with no read of its own.
      await vi.waitFor(() =>
        expect(details.documentEditor.form.document()?.id).toBe('doc-1')
      );
      expect(
        graphqlFetch.mock.calls.every(
          ([q]) => q === Patient || q === PatientWithDocument
        )
      ).toBe(true);
    });

    it('is the record alone on the plain path', async () => {
      const details = await open(undefined);
      expect(patientReads()).toEqual([Patient]);
      expect(details.node()).toBe(record);
      expect(JSON.stringify(Patient)).not.toContain('documentDraft');
    });

    it('reads the record while the registry is unanswered, then again with the document once it names an entry', async () => {
      let answerRegistry!: (value: unknown) => void;
      fetchPatientRegistry.mockReturnValue(
        new Promise(resolve => (answerRegistry = resolve))
      );
      answerPatient();
      const details = create();
      await vi.waitFor(() => expect(details.node()).toBe(record));
      expect(patientReads()).toEqual([Patient]);

      answerRegistry({ entry: patientRegistry });
      await vi.waitFor(() => expect(details.node()).toBe(withDocument));
      expect(patientReads()).toEqual([Patient, PatientWithDocument]);
    });

    it('reads the record once where the registry then names no entry', async () => {
      let answerRegistry!: (value: unknown) => void;
      fetchPatientRegistry.mockReturnValue(
        new Promise(resolve => (answerRegistry = resolve))
      );
      answerPatient();
      const details = create();
      await vi.waitFor(() => expect(details.node()).toBe(record));
      answerRegistry({ entry: undefined });
      await vi.waitFor(() => expect(details.registry()).toBeDefined());
      await Promise.resolve();
      expect(patientReads()).toEqual([Patient]);
    });

    it("follows the store's remembered path before the registry answers", async () => {
      fetchPatientRegistry.mockReturnValue(new Promise(() => {}));
      rememberedPatientRegistry.mockReturnValue({ entry: patientRegistry });
      answerPatient();
      const details = create();
      await vi.waitFor(() => expect(details.node()).toBe(withDocument));
      expect(patientReads()).toEqual([PatientWithDocument]);
    });

    it('falls back to the record when the document read fails', async () => {
      let answerRegistry!: (value: unknown) => void;
      fetchPatientRegistry.mockReturnValue(
        new Promise(resolve => (answerRegistry = resolve))
      );
      graphqlFetch.mockImplementation(async (query: unknown) => {
        if (query === Patient) {
          return { kind: 'success', data: { patient: record } };
        }
        return { kind: 'unexpectedError' };
      });
      const details = create();
      await vi.waitFor(() => expect(details.node()).toBe(record));

      answerRegistry({ entry: patientRegistry });
      await vi.waitFor(() =>
        expect(patientReads()).toEqual([Patient, PatientWithDocument])
      );
      await new Promise(resolve => setTimeout(resolve, 0));
      // The patient stays open on the record read first; its form is not,
      // as the draft could not be read, and the record is not read again.
      expect(details.onDocumentPath()).toBe(true);
      expect(details.node()).toBe(record);
      expect(patientReads()).toEqual([Patient, PatientWithDocument]);
      expect(details.documentEditor.form.status()).toBe('idle');
    });
  });
});
