import { describe, expect, it } from 'vitest';
import { seedPatientDocument } from './patientDocumentSeed';
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
