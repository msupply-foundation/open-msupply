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
}));
vi.mock('../../../api/graphql', () => ({
  graphqlFetch: vi.fn(async () => ({ kind: 'transportError' })),
  describeErrors: () => '',
}));

import { createPatientDetails, type PatientDetails } from './patientDetails';

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
});

const open = async (
  entry: typeof patientRegistry | undefined
): Promise<PatientDetails> => {
  fetchPatientRegistry.mockResolvedValue({ entry });
  const details = createRoot(d => {
    dispose = d;
    return createPatientDetails({
      storeId: () => 'store',
      node: () => undefined,
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
});
