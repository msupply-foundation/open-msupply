import { createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { createDraft } from '../../../domain/documentForm/draft';
import type { Patient } from '../../../plugin-sdk/documents';
import {
  seedNewPatientDocument,
  seedPatientDocument,
  withoutEmptyExtension,
} from './patientDocumentSeed';
import type { PatientResult } from './patient.generated';

type PatientNode = NonNullable<PatientResult['patient']>;

const node = (overrides: Partial<PatientNode> = {}): PatientNode => ({
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
  document: null,
  ...overrides,
});

describe('seedPatientDocument (a name row, as the first document)', () => {
  it('carries the fields the server projects back, and no empty ones', () => {
    expect(seedPatientDocument(node())).toEqual({
      id: 'patient-1',
      code: 'CF0002',
      firstName: 'Alex',
      lastName: 'Demo',
      gender: 'MALE',
      dateOfBirth: '1979-11-03',
    });
  });

  it('puts address, phone and the rest of the contact in the first block', () => {
    const seed = seedPatientDocument(
      node({ address1: '1 Main St', phone: '555', country: 'NZ' })
    );
    expect(seed.contactDetails).toEqual([
      { address1: '1 Main St', phone: '555', country: 'NZ' },
    ]);
  });

  it('keeps a next of kin by link or by name alone, and a death', () => {
    expect(
      seedPatientDocument(
        node({
          nextOfKinId: 'kin',
          nextOfKinName: 'Sam',
          isDeceased: true,
          dateOfDeath: '2026-01-02',
        })
      )
    ).toMatchObject({
      nextOfKin: { id: 'kin', name: 'Sam' },
      isDeceased: true,
      dateOfDeath: '2026-01-02',
    });
    expect(
      seedPatientDocument(node({ nextOfKinName: 'Sam' })).nextOfKin
    ).toEqual({ name: 'Sam' });
  });

  it('gives a nameless row empty names, which the base type requires', () => {
    const seed = seedPatientDocument(
      node({ firstName: null, lastName: null, code: '' })
    );
    expect(seed.firstName).toBe('');
    expect(seed.lastName).toBe('');
    expect(seed.code).toBeUndefined();
  });
});

// The create wizard's last step on the document path (spec/patients › effects
// of creation): the first step's fields carried into the new document.
describe('seedNewPatientDocument', () => {
  const fields = {
    firstName: 'Amina',
    lastName: 'Hassan',
    dateOfBirth: null,
    gender: null,
    address: '',
    phone: '',
  };

  it('carries the names under the minted id, and nothing left empty', () => {
    expect(seedNewPatientDocument('patient-9', fields)).toEqual({
      id: 'patient-9',
      firstName: 'Amina',
      lastName: 'Hassan',
      extension: {},
    });
  });

  it('carries the date of birth and gender when given', () => {
    expect(
      seedNewPatientDocument('patient-9', {
        ...fields,
        dateOfBirth: '1990-04-02',
        gender: 'FEMALE',
      })
    ).toMatchObject({ dateOfBirth: '1990-04-02', gender: 'FEMALE' });
  });

  it('puts the address and phone in the first contact block', () => {
    expect(
      seedNewPatientDocument('patient-9', {
        ...fields,
        address: ' Rue de Venise ',
        phone: '77889900',
      }).contactDetails
    ).toEqual([{ address1: 'Rue de Venise', phone: '77889900' }]);
    expect(
      seedNewPatientDocument('patient-9', { ...fields, phone: '77889900' })
        .contactDetails
    ).toEqual([{ phone: '77889900' }]);
  });

  // As the old client's create starts every new patient, so a field the
  // deployment requires inside `extension` is required from the start of a
  // plugin's patient form.
  it('starts an empty extension', () => {
    expect(seedNewPatientDocument('patient-9', fields).extension).toEqual({});
  });
});

// The host's default patient form takes it out as it mounts
// (PatientDocumentFormView), since it draws none of the fields inside it.
describe('withoutEmptyExtension', () => {
  const draftOf = (seed: Patient) =>
    createRoot(dispose => {
      const c = createDraft<Patient>({
        schema: () => undefined,
        validate: () => undefined,
      });
      c.reset(seed);
      withoutEmptyExtension(c.draft);
      return { draft: c.draft, dispose };
    });

  it('takes out an empty extension', () => {
    const { draft, dispose } = draftOf({ id: 'p', extension: {} } as Patient);
    expect(draft.get('extension')).toBeUndefined();
    dispose();
  });

  it('leaves an extension that holds values', () => {
    const { draft, dispose } = draftOf({
      id: 'p',
      extension: { nationality: 'Djiboutienne' },
    } as Patient);
    expect(draft.get('extension')).toEqual({ nationality: 'Djiboutienne' });
    dispose();
  });
});
