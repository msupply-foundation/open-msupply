import { t } from '../../../intl';
import { isoDateToDate } from '../../../ui/elements/inputs/dateTimeConvert';
import type { FieldError } from '../../../ui/layout/Form/formValidation';
import type { Gender } from '../../../domain/patient';
import type { InsertPatientVariables } from '../list/insertPatient.generated';
import type { UpdatePatientVariables } from './updatePatient.generated';
import type { PatientResult } from './patient.generated';

type PatientNode = NonNullable<PatientResult['patient']>;

// The plain-path editable field set (spec/patients S3 Details, the built-in
// default). Only fields the plain path can WRITE — address2 / country / email /
// website are read-only through this path (contract › editing wire trap), and
// id / kind / home store / creation time / custom fields are immutable, so none
// appear here.
export interface PatientDraft {
  code: string;
  code2: string;
  firstName: string;
  lastName: string;
  gender: Gender | null;
  dateOfBirth: string | null;
  address1: string;
  phone: string;
  nextOfKinId: string | null;
  nextOfKinName: string;
  isDeceased: boolean;
  dateOfDeath: string | null;
}

export const emptyDraft = (): PatientDraft => ({
  code: '',
  code2: '',
  firstName: '',
  lastName: '',
  gender: null,
  dateOfBirth: null,
  address1: '',
  phone: '',
  nextOfKinId: null,
  nextOfKinName: '',
  isDeceased: false,
  dateOfDeath: null,
});

export const seedDraft = (node: PatientNode): PatientDraft => ({
  code: node.code,
  code2: node.code2 ?? '',
  firstName: node.firstName ?? '',
  lastName: node.lastName ?? '',
  gender: node.gender,
  dateOfBirth: node.dateOfBirth,
  address1: node.address1 ?? '',
  phone: node.phone ?? '',
  nextOfKinId: node.nextOfKinId ?? null,
  nextOfKinName: node.nextOfKinName ?? '',
  isDeceased: node.isDeceased,
  dateOfDeath: node.dateOfDeath,
});

// The plain-path built-in form's required-field rules (AC-C3): code + first
// name + last name, each a plain required error (deferred to Save). One list so
// the create wizard and the edit tab validate identically; feed to
// createFormValidation and read back per field / as the summary.
export const patientFieldErrors = (draft: PatientDraft): FieldError[] => [
  { id: 'code', label: t('label.code'), failed: draft.code.trim() === '' },
  {
    id: 'firstName',
    label: t('label.first-name'),
    failed: draft.firstName.trim() === '',
  },
  {
    id: 'lastName',
    label: t('label.last-name'),
    failed: draft.lastName.trim() === '',
  },
];

// The plain-path built-in form requires code + first name + last name before it
// will submit (AC-C3); the server itself requires only id + code.
export const isDraftValid = (draft: PatientDraft): boolean =>
  draft.code.trim() !== '' &&
  draft.firstName.trim() !== '' &&
  draft.lastName.trim() !== '';

// Structural equality of two drafts (dirty check). Both are plain field bags, so
// a stable stringify is exact and cheap.
export const draftEquals = (a: PatientDraft, b: PatientDraft): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

// Empty string → null: the plain-path write treats an omitted optional as
// cleared, so a blank box must be sent as an explicit null, not "".
const orNull = (value: string): string | null => (value.trim() ? value : null);

// The FULL plain-path field set for a create OR an edit. updatePatient is a
// destructive full replace — EVERY field is sent so an omitted one clears and
// `name` recomputes from the parts (AC-E2). The same shape serves insert
// (InsertPatientInput === UpdatePatientInput minus none). date of death rides
// the deceased flag: only sent when deceased (the form hides it otherwise).
const toFullInput = (id: string, draft: PatientDraft) => ({
  id,
  code: draft.code,
  code2: orNull(draft.code2),
  firstName: orNull(draft.firstName),
  lastName: orNull(draft.lastName),
  gender: draft.gender,
  dateOfBirth: draft.dateOfBirth,
  address1: orNull(draft.address1),
  phone: orNull(draft.phone),
  isDeceased: draft.isDeceased,
  dateOfDeath: draft.isDeceased ? draft.dateOfDeath : null,
  nextOfKinId: draft.nextOfKinId,
  nextOfKinName: orNull(draft.nextOfKinName),
});

export const toInsertInput = (
  id: string,
  draft: PatientDraft
): InsertPatientVariables['input'] => toFullInput(id, draft);

export const toUpdateInput = (
  id: string,
  draft: PatientDraft
): UpdatePatientVariables['input'] => toFullInput(id, draft);

// Age in whole years derived from date of birth (AC-M3), matching the server's
// floor(days-since-dob / 365). Undefined when there is no (or a future) dob.
export const ageFromDob = (dob: string | null): number | undefined => {
  if (!dob) return undefined;
  const birth = isoDateToDate(dob);
  if (!birth) return undefined;
  const ms = Date.now() - birth.getTime();
  if (ms < 0) return undefined;
  return Math.floor(ms / (365 * 24 * 60 * 60 * 1000));
};
