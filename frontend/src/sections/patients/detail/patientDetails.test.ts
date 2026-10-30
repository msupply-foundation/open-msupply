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
import { UpdatePatient } from './updatePatient.generated';

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

  // The screen re-reads the patient after a plain-path save, and the draft
  // re-seeds from that read. Until it answers, the read still holds the
  // patient as it was before the save, which must not be taken for it.
  describe('after a plain-path save', () => {
    /** Takes the save, and answers the re-read with `reread`. */
    const answerSave = (reread: () => Promise<PatientNode>) =>
      graphqlFetch.mockImplementation(async (query: unknown) => {
        if (query === UpdatePatient) {
          return {
            kind: 'success',
            data: {
              updatePatient: { __typename: 'PatientNode', id: record.id },
            },
          };
        }
        if (query === Patient) {
          return { kind: 'success', data: { patient: await reread() } };
        }
        return { kind: 'transportError' };
      });

    const openSeeded = async () => {
      const details = await open(undefined);
      await vi.waitFor(() => expect(details.editor.edit.code).toBe('CF0002'));
      return details;
    };

    it('shows the saved values, unchanged, while the re-read is out and once it lands', async () => {
      const details = await openSeeded();
      const editor = details.editor;
      editor.setField('isDeceased', true);
      expect(editor.isDirty()).toBe(true);

      const saved: PatientNode = { ...record, isDeceased: true };
      let answerRead: (() => void) | undefined;
      answerSave(async () => {
        await new Promise<void>(resolve => (answerRead = resolve));
        return saved;
      });
      // The save awaits the re-read, so it does not resolve until the read
      // lands below; hold the promise and let the read start first.
      const done = editor.doSave(details.refetch);
      await vi.waitFor(() => expect(answerRead).toBeTypeOf('function'));

      // The re-read is out: the form holds the saved draft, pristine.
      expect(details.node()).toBe(record);
      expect(editor.edit.isDeceased).toBe(true);
      expect(editor.isDirty()).toBe(false);

      answerRead!();
      await done;
      expect(details.node()).toBe(saved);
      expect(editor.edit.isDeceased).toBe(true);
      expect(editor.isDirty()).toBe(false);
    });

    // Spaces in Code 2 are saved as no Code 2: the re-read answers as before,
    // with the same object (api/graphql.ts › structural sharing).
    it('counts the next edit after a save the re-read shows no change in', async () => {
      const details = await openSeeded();
      const editor = details.editor;
      editor.setField('code2', '  ');
      expect(editor.isDirty()).toBe(true);

      answerSave(async () => record);
      await editor.doSave(details.refetch);
      expect(patientReads()).toEqual([Patient, Patient]);
      expect(editor.isDirty()).toBe(false);

      editor.setField('firstName', 'Sam');
      expect(editor.isDirty()).toBe(true);
      editor.resetDraft();
      expect(editor.isDirty()).toBe(false);
    });

    // The re-read is the same object, so the draft must still re-seed from it:
    // the spaces typed into Code 2 were stored as none, and the form shows
    // that, not the spaces.
    it('shows what was stored after a save the re-read shows no change in', async () => {
      const details = await openSeeded();
      const editor = details.editor;
      expect(editor.edit.code2).toBe('');
      editor.setField('code2', '  ');

      answerSave(async () => record);
      await editor.doSave(details.refetch);
      expect(patientReads()).toEqual([Patient, Patient]);

      expect(editor.edit.code2).toBe('');
      expect(editor.isDirty()).toBe(false);
    });

    // The after-save state ends with the re-read, so a later read of the same
    // patient (a background refresh) leaves an unsaved edit alone, as a new
    // read of an already-seeded patient always does.
    it('keeps a later edit when a new read of the same patient lands after a save', async () => {
      const details = await openSeeded();
      const editor = details.editor;

      editor.setField('code2', '  ');
      answerSave(async () => record);
      await editor.doSave(details.refetch);
      expect(patientReads()).toEqual([Patient, Patient]);
      expect(editor.isDirty()).toBe(false);

      editor.setField('firstName', 'Sam');
      expect(editor.isDirty()).toBe(true);

      const refreshed: PatientNode = { ...record };
      graphqlFetch.mockImplementation(async (query: unknown) =>
        query === Patient
          ? { kind: 'success', data: { patient: refreshed } }
          : { kind: 'transportError' }
      );
      await details.refetch();
      await vi.waitFor(() => expect(details.node()).toBe(refreshed));

      expect(editor.edit.firstName).toBe('Sam');
      expect(editor.isDirty()).toBe(true);
    });
  });
});
