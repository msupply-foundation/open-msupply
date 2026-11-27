import { describe, expect, it } from 'vitest';
import { isUnnamedPatientId, shownPatientName } from './patientName';

// In node the catalog isn't loaded, so t() returns the key.
describe('shownPatientName (rules › the unnamed patient)', () => {
  it('shows the unnamed patient by the translated label, not its saved name', () => {
    expect(shownPatientName('Unnamed patient', 'unnamed_patient_store_a')).toBe(
      'label.unnamed-patient'
    );
  });

  it('shows any other patient by their own name', () => {
    expect(shownPatientName('Malfoy, Draco', 'patient_1')).toBe(
      'Malfoy, Draco'
    );
    expect(shownPatientName('Malfoy, Draco', undefined)).toBe('Malfoy, Draco');
  });
});

describe('isUnnamedPatientId (kdd/unnamed-patient)', () => {
  it("knows any store's unnamed patient by the start of its id", () => {
    expect(isUnnamedPatientId('unnamed_patient_store_a')).toBe(true);
    expect(isUnnamedPatientId('unnamed_patient_B7A2')).toBe(true);
  });

  it('takes no other id for it, however close', () => {
    expect(isUnnamedPatientId('patient_unnamed_patient_1')).toBe(false);
    expect(isUnnamedPatientId('unnamedXpatient_store_a')).toBe(false);
    expect(isUnnamedPatientId('')).toBe(false);
    expect(isUnnamedPatientId(null)).toBe(false);
    expect(isUnnamedPatientId(undefined)).toBe(false);
  });
});
