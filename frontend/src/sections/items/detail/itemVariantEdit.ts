import { t } from '../../../intl';
import type {
  UpsertItemVariantResult,
  UpsertItemVariantVariables,
} from './itemVariantMutations.generated';
import type { ItemVariantsResult } from './itemVariants.generated';

// Pure logic for the variant editor modal (spec/items S3, rules.md § item
// variants and packaging). Colocated + pure so the packaging/validity/
// error-mapping rules are unit-tested without the screen — mirrors
// locationEdit.ts / ancillaryItemEdit.ts.

export type ItemVariantRow = NonNullable<
  Extract<
    ItemVariantsResult['items'],
    { __typename: 'ItemConnector' }
  >['nodes'][number]['variants']
>[number];

/**
 * One packaging row. `packagingLevel` is fixed at seed time and never
 * user-edited (the reference app's grid renders it read-only; rules.md's
 * seeded 1/2/3 is "a starting point, not a rule" for the row SET, not a
 * licence to renumber an existing row). `packSize`/`volumePerUnit` are
 * `undefined` while the input is blank, saved as invalid (0) so Save catches
 * it rather than silently defaulting.
 */
export type DraftPackagingRow = {
  id: string;
  name: string;
  packagingLevel: number;
  packSize: number | undefined;
  volumePerUnit: number | undefined;
};

export type DraftItemVariant = {
  name: string;
  /** Selected location-type id; '' = none. */
  locationTypeId: string;
  /** Selected manufacturer id; '' = none. */
  manufacturerId: string;
  /** Vaccine items only (ui-surface S3); '' = none. */
  vvmType: string;
  packaging: DraftPackagingRow[];
};

/**
 * A fresh create form: three seeded packaging rows — Primary/Secondary/
 * Tertiary at levels 1/2/3 (rules.md § item variants and packaging;
 * ui-surface S3) — each with a client-generated id so the first save's
 * full-replacement packaging set has real identities from the start.
 */
export const emptyForm = (): DraftItemVariant => ({
  name: '',
  locationTypeId: '',
  manufacturerId: '',
  vvmType: '',
  packaging: [
    {
      id: crypto.randomUUID(),
      name: t('label.primary'),
      packagingLevel: 1,
      packSize: undefined,
      volumePerUnit: undefined,
    },
    {
      id: crypto.randomUUID(),
      name: t('label.secondary'),
      packagingLevel: 2,
      packSize: undefined,
      volumePerUnit: undefined,
    },
    {
      id: crypto.randomUUID(),
      name: t('label.tertiary'),
      packagingLevel: 3,
      packSize: undefined,
      volumePerUnit: undefined,
    },
  ],
});

/** Seed the edit form from the clicked variant card. */
export const formFromVariant = (variant: ItemVariantRow): DraftItemVariant => ({
  name: variant.name,
  locationTypeId: variant.locationTypeId ?? '',
  manufacturerId: variant.manufacturerId ?? '',
  vvmType: variant.vvmType ?? '',
  packaging: variant.packagingVariants.map(row => ({
    id: row.id,
    name: row.name,
    packagingLevel: row.packagingLevel,
    packSize: row.packSize ?? undefined,
    volumePerUnit: row.volumePerUnit ?? undefined,
  })),
});

/**
 * ui-surface S3 — Save disabled until the name is set and every packaging row
 * has a POSITIVE pack size and volume per unit (rules.md's "positive"
 * requirement; the client-side mirror of the server's LessThanZero guard).
 */
export const isFormValid = (form: DraftItemVariant): boolean =>
  form.name.trim() !== '' &&
  form.packaging.every(
    row => (row.packSize ?? 0) > 0 && (row.volumePerUnit ?? 0) > 0
  );

/**
 * The upsert input — always the FULL current field set: packagingVariants is
 * a full-replacement set (contract.md ⚠️ wire trap, rules.md § item variants
 * and packaging) — an omitted row is a deletion, so every save resends every
 * current row. `locationTypeId`/`manufacturerId`/`vvmType` are
 * NullableStringUpdate wrappers — `{ value: null }` clears, `{ value: id }`
 * sets; always sent (never omitted) so an edit can also clear a previously-set
 * value.
 */
export const buildUpsertInput = (
  form: DraftItemVariant,
  itemId: string,
  id: string
): UpsertItemVariantVariables['input'] => ({
  id,
  itemId,
  name: form.name,
  locationTypeId: { value: form.locationTypeId || null },
  manufacturerId: { value: form.manufacturerId || null },
  vvmType: { value: form.vvmType || null },
  packagingVariants: form.packaging.map(row => ({
    id: row.id,
    name: row.name,
    packagingLevel: row.packagingLevel,
    packSize: row.packSize ?? 0,
    volumePerUnit: row.volumePerUnit ?? 0,
  })),
});

type UpsertError = Extract<
  UpsertItemVariantResult['centralServer']['itemVariant']['upsertItemVariant'],
  { __typename: 'UpsertItemVariantError' }
>['error'];

/**
 * A save rejection for the modal's inline banner (D21/D22 — the outcome shows
 * in the initiating surface; the dialog stays open with entries intact). The
 * one typed rejection (a duplicate variant name) gets the case's own copy;
 * everything else (DatabaseError/InternalError — vestigial here, per
 * contract.md) falls through to the generic failure message, matching
 * ui-surface S3/S6.
 */
export type SaveRejection = { kind: 'duplicateName' } | { kind: 'other' };

export const saveRejection = (error: UpsertError): SaveRejection =>
  error.__typename === 'UniqueValueViolation' && error.field === 'name'
    ? { kind: 'duplicateName' }
    : { kind: 'other' };

export const rejectionMessage = (rejection: SaveRejection): string =>
  rejection.kind === 'duplicateName'
    ? t('error.duplicate-item-variant-name')
    : t('error.failed-to-save-item-variant');

/**
 * A location type shown the one way the spec names it (name + temperature
 * range) — duplicates locations/list/locationTypeLabel.ts's format under its
 * own name rather than importing across verticals (the same call made for
 * the itemVariantLocationTypes query itself).
 */
export const locationTypeLabel = (
  locationType: {
    name: string;
    minTemperature: number;
    maxTemperature: number;
  } | null
): string =>
  locationType
    ? t('label.location-temperature-range', {
        locationName: locationType.name,
        minTemperature: locationType.minTemperature,
        maxTemperature: locationType.maxTemperature,
      }).trim()
    : '';
