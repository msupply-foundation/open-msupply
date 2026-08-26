import type {
  InsertLocationResult,
  InsertLocationVariables,
  LocationsListResult,
  UpdateLocationResult,
  UpdateLocationVariables,
} from './locations.generated';

// Pure logic behind the create/edit modal (spec/locations S2) — form shape,
// the OMS-REG-INV-01.24 validation gate, the two wire inputs, the
// save-rejection mapping, and the OK-&-next advance. Kept free of solid-js and
// t() so node vitest covers it directly (spec/IMPLEMENTING.md C1/C2 — the
// behavioural leg without a CI backend runs at this logic level).

/**
 * One list row — the generated node shape, never remapped (kdd/type-safety).
 */
export type LocationRow = LocationsListResult['locations']['nodes'][number];

/**
 * The editor's field state. Strings mirror the inputs directly; '' for the
 * location type means "none" (the optional, clearable pick); `volume`
 * undefined means the box is blank (saved as the 0 default — rules.md
 * § required fields). Volume-used is deliberately ABSENT: it is server-derived
 * and no input carries it (OMS-REG-INV-01.30).
 */
export type LocationFormState = {
  name: string;
  code: string;
  /** Selected location-type id; '' = none. */
  locationTypeId: string;
  /** Capacity in m³; undefined = blank (defaults to 0 on save). */
  volume: number | undefined;
  onHold: boolean;
};

/**
 * A fresh create form (OMS-REG-INV-01.1 defaults: on-hold off, volume 0, no
 * type).
 */
export const EMPTY_FORM: LocationFormState = {
  name: '',
  code: '',
  locationTypeId: '',
  volume: undefined,
  onHold: false,
};

/** Seed the edit form from the clicked list row (FL3). */
export const formFromLocation = (location: LocationRow): LocationFormState => ({
  name: location.name,
  code: location.code,
  locationTypeId: location.locationType?.id ?? '',
  volume: location.volume,
  onHold: location.onHold,
});

/**
 * OMS-REG-INV-01.24 — code and name are required in the UI: OK / OK-&-next
 * stay disabled (and no request is sent) while either is empty or
 * whitespace-only.
 */
export const isFormValid = (form: LocationFormState): boolean =>
  form.name.trim() !== '' && form.code.trim() !== '';

/**
 * The create input (OMS-REG-INV-01.1). The id is client-generated (rules.md §
 * identity); the UI always sends a name (OMS-REG-INV-01.24), so the server's
 * name-defaults-to-code fallback (OMS-REG-INV-01.23) is wire behaviour we
 * never rely on. No volumeUsed field exists on the input (OMS-REG-INV-01.30).
 */
export const buildInsertInput = (
  form: LocationFormState,
  id: string
): InsertLocationVariables['input'] => ({
  id,
  code: form.code,
  name: form.name,
  onHold: form.onHold,
  volume: form.volume ?? 0,
  locationTypeId: form.locationTypeId || null,
});

/**
 * The edit input — always the FULL current field set, never a sparse patch:
 * updateLocation's `locationTypeId` is NOT partial, so omitting it (or sending
 * null) clears the stored type. Re-sending every field is what keeps the type
 * intact across an unrelated edit (contract.md ⚠️ wire trap;
 * OMS-REG-INV-01.29).
 */
export const buildUpdateInput = (
  form: LocationFormState,
  id: string
): UpdateLocationVariables['input'] => ({
  id,
  code: form.code,
  name: form.name,
  onHold: form.onHold,
  volume: form.volume ?? 0,
  locationTypeId: form.locationTypeId || null,
});

type InsertError = Extract<
  InsertLocationResult['insertLocation'],
  { __typename: 'InsertLocationError' }
>['error'];
type UpdateError = Extract<
  UpdateLocationResult['updateLocation'],
  { __typename: 'UpdateLocationError' }
>['error'];

/**
 * A save rejection for the modal's inline banner (D21/D22 — the outcome shows
 * in the initiating surface; the dialog stays open with entries intact).
 * Discriminated, t()-free: the component maps `duplicateCode` to its
 * translated message (OMS-REG-INV-01.25, OMS-REG-INV-01.27); everything else
 * (wrong store — OMS-REG-INV-01.28, id collision, generic) falls through to
 * the server's description, matching the current app's generic-error parity
 * (contract.md § identity).
 */
export type SaveRejection =
  { kind: 'duplicateCode' } | { kind: 'other'; description: string };

export const saveRejection = (
  error: InsertError | UpdateError
): SaveRejection =>
  error.__typename === 'UniqueValueViolation' && error.field === 'code'
    ? { kind: 'duplicateCode' }
    : { kind: 'other', description: error.description };

/**
 * OMS-REG-INV-01.5 (edit half) — the row OK-&-next advances to: the next list
 * location after the current one, or undefined on the last row (the affordance
 * is disabled there — ui-surface S2).
 */
export const nextLocation = <T extends { id: string }>(
  rows: readonly T[],
  currentId: string
): T | undefined => {
  const index = rows.findIndex(row => row.id === currentId);
  return index >= 0 ? rows[index + 1] : undefined;
};
