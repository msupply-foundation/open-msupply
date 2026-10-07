import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * Which path a patient's details save through (spec/patients rules › two
 * persistence paths), as the patient screen's Details tab and the picker's
 * edit modal both decide it: the store's Patient registry entry, and nothing
 * else. The registry read is mocked; the editors are the real ones.
 */

const fetchPatientRegistry = vi.fn();
vi.mock('./programs/programsApi', () => ({
  fetchPatientRegistry: (storeId: string) => fetchPatientRegistry(storeId),
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
vi.mock('../../../api/graphql', () => ({
  graphqlFetch: vi.fn(async () => ({ kind: 'transportError' })),
  describeErrors: () => '',
}));

import { createPatientDetails, type PatientDetails } from './patientDetails';
import { graphqlFetch } from '../../../api/graphql';
import { PatientDocumentDraft } from './patientDocumentDraft.generated';
import { Patient, type PatientResult } from './patient.generated';

type PatientNode = NonNullable<PatientResult['patient']>;

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

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  fetchPatientRegistry.mockReset();
  vi.mocked(graphqlFetch).mockClear();
});

const open = async (
  entry: typeof patientRegistry | undefined,
  node?: PatientNode
): Promise<PatientDetails> => {
  fetchPatientRegistry.mockResolvedValue({ entry });
  const details = createRoot(d => {
    dispose = d;
    return createPatientDetails({
      storeId: () => 'store',
      node: () => node,
    });
  });
  await vi.waitFor(() => expect(details.registry()).toBeDefined());
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

  it('decides nothing until the registry is answered', () => {
    fetchPatientRegistry.mockReturnValue(new Promise(() => {}));
    const details = createRoot(d => {
      dispose = d;
      return createPatientDetails({
        storeId: () => 'store',
        node: () => undefined,
      });
    });
    expect(details.registry()).toBeUndefined();
    expect(details.canSave()).toBe(false);
  });

  // Only the document path reads it, as building it parses the stored
  // document: one the server cannot read must not keep the patient from
  // opening on a store that never edits it.
  describe("the patient document's draft", () => {
    const withDocument: PatientNode = {
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
        name: 'patients/patient-1',
      },
    };
    const draftReads = () =>
      vi
        .mocked(graphqlFetch)
        .mock.calls.filter(([query]) => query === PatientDocumentDraft);

    it('is read on the document path, for a patient with a document', async () => {
      await open(patientRegistry, withDocument);
      await vi.waitFor(() => expect(draftReads()).toHaveLength(1));
      expect(draftReads()[0]?.[1]).toEqual({
        storeId: 'store',
        patientId: 'patient-1',
      });
    });

    it('is not part of the patient read, which every store makes', () => {
      expect(JSON.stringify(Patient)).not.toContain('documentDraft');
    });

    it('is never read on the plain path', async () => {
      const details = await open(undefined, withDocument);
      expect(details.onDocumentPath()).toBe(false);
      await Promise.resolve();
      expect(draftReads()).toEqual([]);
    });

    it('is not read for a patient with no document yet', async () => {
      await open(patientRegistry, { ...withDocument, document: null });
      await Promise.resolve();
      expect(draftReads()).toEqual([]);
    });
  });
});
