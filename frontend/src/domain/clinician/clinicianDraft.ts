import { t } from '../../intl';
import type { FieldError } from '../../ui/layout/Form/formValidation';
import type { Gender } from '../patient';
import type { InsertClinicianVariables } from './insertClinician.generated';
import type { Clinician } from './clinicianResource';

// The create-clinician form's field set (spec/prescriptions ui-surface S8).
// Every settable field of the insert input is here — the server takes nothing
// else, and a created clinician is always active with no addresses, phone, or
// email (contract › patient, clinician, program, diagnosis). Blank-able text
// fields hold '' rather than null so the inputs stay controlled; the conversion
// to the wire's nulls happens in toInsertInput.
export interface ClinicianDraft {
  code: string;
  firstName: string;
  lastName: string;
  initials: string;
  mobile: string;
  gender: Gender | null;
}

export const emptyDraft = (): ClinicianDraft => ({
  code: '',
  firstName: '',
  lastName: '',
  initials: '',
  mobile: '',
  gender: null,
});

// The three required fields (spec/prescriptions rules › patient, clinician,
// program, diagnosis) — the same three the server enforces, so a save that
// passes these cannot be rejected for emptiness. Plain required errors, so they
// stay quiet until Save is attempted; feed to createFormValidation.
export const clinicianFieldErrors = (draft: ClinicianDraft): FieldError[] => [
  { id: 'code', label: t('label.code'), failed: draft.code.trim() === '' },
  {
    id: 'lastName',
    label: t('label.last-name'),
    failed: draft.lastName.trim() === '',
  },
  {
    id: 'initials',
    label: t('label.initials'),
    failed: draft.initials.trim() === '',
  },
];

/**
 * Whether a clinician already in the store's list carries this code. A code
 * does NOT identify a clinician — two may share one, and the server never
 * checks — so this drives a confirmation, never a refusal (`.67`). Compared
 * case-insensitively because the form upper-cases what is typed while existing
 * records may not be.
 */
export const codeAlreadyUsed = (
  clinicians: readonly Clinician[],
  code: string
): boolean => {
  const wanted = code.trim().toUpperCase();
  if (wanted === '') return false;
  return clinicians.some(c => c.code.trim().toUpperCase() === wanted);
};

// Empty string → omitted: an optional the user left blank must not be sent as
// "", which would store a blank rather than nothing.
const orNull = (value: string): string | null =>
  value.trim() === '' ? null : value.trim();

/** The insert input for a drafted clinician; `id` is minted by the caller. */
export const toInsertInput = (
  id: string,
  draft: ClinicianDraft
): InsertClinicianVariables['input'] => ({
  id,
  code: draft.code.trim().toUpperCase(),
  initials: draft.initials.trim(),
  lastName: draft.lastName.trim(),
  firstName: orNull(draft.firstName),
  mobile: orNull(draft.mobile),
  gender: draft.gender,
});
