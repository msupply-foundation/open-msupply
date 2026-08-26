import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { setDictionaries, setLocale } from '../../intl/intl';
import commonEn from '../../intl/locales/en/common.json';

// The gender-options gate (spec/patients rules.md § configuration gates,
// AC-G3; anchor OMS-REG-DIS-01.50): the genderOptions preference defines the
// exact set every gender picker offers, and gender values render through
// fixed label keys regardless of which subset is configured (ui-surface §
// gender labels). The preference read is driven directly, navGates-style.
const state = {
  genderOptions: [] as string[],
};

vi.mock('../../store/storeContext', () => ({
  patientPreferences: () => ({ genderOptions: state.genderOptions }),
}));

import { genderLabel, genderOptions, type Gender } from './gender';

beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
});

afterAll(() => {
  setDictionaries({});
});

describe('genderOptions (OMS-REG-DIS-01.50 — pickers offer the configured subset)', () => {
  it('offers exactly the configured subset, in wire order, with its labels', () => {
    state.genderOptions = ['UNKNOWN', 'FEMALE', 'MALE'];
    expect(genderOptions()).toEqual([
      { value: 'UNKNOWN', label: 'Unknown' },
      { value: 'FEMALE', label: 'Female' },
      { value: 'MALE', label: 'Male' },
    ]);
  });

  it('offers nothing when the preference is emptied (no minimum enforced)', () => {
    state.genderOptions = [];
    expect(genderOptions()).toEqual([]);
  });

  it('offers a finer-grained variant when configured, humanised (no catalog key)', () => {
    state.genderOptions = ['TRANSGENDER_MALE_HORMONE'];
    expect(genderOptions()).toEqual([
      { value: 'TRANSGENDER_MALE_HORMONE', label: 'Transgender male hormone' },
    ]);
  });
});

describe('genderLabel (ui-surface § gender labels — fixed keys regardless of subset)', () => {
  it('renders the seven base genders through their catalog keys', () => {
    const labels: Record<string, string> = {
      FEMALE: 'Female',
      MALE: 'Male',
      NON_BINARY: 'Non-binary',
      TRANSGENDER: 'Transgender',
      TRANSGENDER_FEMALE: 'Transgender female',
      TRANSGENDER_MALE: 'Transgender male',
      UNKNOWN: 'Unknown',
    };
    for (const [value, label] of Object.entries(labels)) {
      expect(genderLabel(value as Gender)).toBe(label);
    }
  });

  it('humanises the hormone/surgical variants — never the raw enum, never blank', () => {
    expect(genderLabel('TRANSGENDER_FEMALE_SURGICAL')).toBe(
      'Transgender female surgical'
    );
    expect(genderLabel('TRANSGENDER_MALE_HORMONE')).toBe(
      'Transgender male hormone'
    );
  });

  it('renders a stored value even when the configured subset excludes it', () => {
    state.genderOptions = ['FEMALE'];
    expect(genderLabel('NON_BINARY')).toBe('Non-binary');
  });
});
