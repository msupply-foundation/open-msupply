import { describe, expect, it } from 'vitest';
import { composePatientCode } from './patientCode';

// spec/patients § generating a code — DIS-02 `.54`: the store name's first
// three letters upper-cased + the counter value padded to four digits.
describe('composePatientCode (DIS-02 .54 — generated code composition)', () => {
  it('takes the first three letters of the store name, upper-cased', () => {
    expect(composePatientCode('General Warehouse', 1)).toBe('GEN0001');
    expect(composePatientCode('general warehouse', 1)).toBe('GEN0001');
  });

  it('pads the counter value to four digits', () => {
    expect(composePatientCode('Store', 7)).toBe('STO0007');
    expect(composePatientCode('Store', 42)).toBe('STO0042');
    expect(composePatientCode('Store', 1234)).toBe('STO1234');
  });

  // The counter is per store and unbounded, so it eventually outgrows the pad.
  // Overflowing must keep every digit rather than truncate — a wrong code is
  // worse than a long one.
  it('keeps every digit once the counter outgrows the pad', () => {
    expect(composePatientCode('Store', 12345)).toBe('STO12345');
  });

  // A short store name contributes all it has: the prefix is "first three
  // characters", not "three characters padded" (matching the reference
  // generator, which slices without padding).
  it('uses a short store name as-is', () => {
    expect(composePatientCode('Ab', 1)).toBe('AB0001');
    expect(composePatientCode('', 1)).toBe('0001');
  });

  // The prefix is characters of the name, punctuation and spaces included — the
  // rule is positional, not "first three letters of the first word".
  it('slices positionally, not by word', () => {
    expect(composePatientCode('A-B Clinic', 1)).toBe('A-B0001');
  });
});
