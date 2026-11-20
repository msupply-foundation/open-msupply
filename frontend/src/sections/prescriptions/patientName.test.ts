import { describe, expect, it } from 'vitest';
import { shownPatientName } from './patientName';

// In node the catalog isn't loaded, so t() returns the key.
describe('shownPatientName (rules › the unnamed patient)', () => {
  it('shows the unnamed patient by the translated label, not its saved name', () => {
    expect(shownPatientName('Unnamed patient', true)).toBe(
      'label.unnamed-patient'
    );
  });

  it('shows any other patient by their own name', () => {
    expect(shownPatientName('Malfoy, Draco', false)).toBe('Malfoy, Draco');
    expect(shownPatientName('Malfoy, Draco', undefined)).toBe('Malfoy, Draco');
  });
});
