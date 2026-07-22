import { t } from '../../intl';
import type { LocaleKey } from '../../intl/locales';
import { dictionaries, locale } from '../../intl/intl';
import { patientPreferences } from '../../store/storeContext';
import type { PatientSearchFragment } from './patient.generated';

// A GenderTypeNode value (spec/patients S5). Derived from the generated schema
// type so it stays in lock-step with the wire (kdd/type-safety).
export type Gender = NonNullable<PatientSearchFragment['patient']['gender']>;

// Render a gender through its fixed label key, regardless of which configured
// subset is offered (spec/patients S5). The finer-grained hormone/surgical
// variants have no catalog key yet, so — like the activity-log event labels —
// look the key up in the active dictionary first and fall back to a humanised
// enum value when unmapped (keeps LocaleKey compile-safe, never renders blank).
export const genderLabel = (gender: Gender): string => {
  const key = `gender.${gender.toLowerCase().replace(/_/g, '-')}` as LocaleKey;
  const dict = dictionaries()[locale()];
  if (dict?.[key] !== undefined) return t(key);
  return gender
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, c => c.toUpperCase());
};

export interface GenderOption {
  value: Gender;
  label: string;
}

// The gender options every picker offers — the store's configured subset
// (spec/patients AC-G3: 7 of 11 on the reference store), each with its display
// label. Reactive (reads patientPreferences), so a post-sync preference change
// re-offers in place.
export const genderOptions = (): GenderOption[] =>
  patientPreferences().genderOptions.map(value => ({
    value,
    label: genderLabel(value),
  }));
