import { generateUUID } from '../../../uuid';
import { t, type LocaleKey } from '../../../intl';
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
 * `undefined` while the input is blank. `barcode` is read-only here: barcodes
 * are set and removed on the Barcodes tab, never through this form.
 */
export type DraftPackagingRow = {
  id: string;
  name: string;
  packagingLevel: number;
  packSize: number | undefined;
  volumePerUnit: number | undefined;
  barcode?: string;
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

/** The three seeded levels (rules.md § item variants and packaging). */
const SEEDED_LEVELS: [number, LocaleKey][] = [
  [1, 'label.primary'],
  [2, 'label.secondary'],
  [3, 'label.tertiary'],
];

const blankRow = (packagingLevel: number, labelKey: LocaleKey) => ({
  id: generateUUID(),
  name: t(labelKey),
  packagingLevel,
  packSize: undefined,
  volumePerUnit: undefined,
});

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
  packaging: SEEDED_LEVELS.map(([level, key]) => blankRow(level, key)),
});

/**
 * Seed the edit form from the clicked variant card. Any seeded level the
 * variant doesn't have comes back as a blank row: blank rows aren't saved
 * (isBlankRow), and the grid has no add-row control, so without this a level
 * left out once could never be added again.
 */
export const formFromVariant = (variant: ItemVariantRow): DraftItemVariant => {
  const saved = variant.packagingVariants.map(row => ({
    id: row.id,
    name: row.name,
    packagingLevel: row.packagingLevel,
    packSize: row.packSize ?? undefined,
    volumePerUnit: row.volumePerUnit ?? undefined,
    barcode: row.barcode ?? undefined,
  }));
  const missing = SEEDED_LEVELS.filter(
    ([level]) => !saved.some(row => row.packagingLevel === level)
  ).map(([level, key]) => blankRow(level, key));
  return {
    name: variant.name,
    locationTypeId: variant.locationTypeId ?? '',
    manufacturerId: variant.manufacturerId ?? '',
    vvmType: variant.vvmType ?? '',
    packaging: [...saved, ...missing].sort(
      (a, b) => a.packagingLevel - b.packagingLevel
    ),
  };
};

/**
 * A row with no pack size, no volume and no barcode hasn't been entered: the
 * seeded rows are "a starting point, not a rule" (rules.md § item variants and
 * packaging), so a blank one is left out of the save rather than blocking it
 * (OMS-REG-CAT-05.21). A row holding a barcode is never blank: leaving it out
 * would delete the barcode everywhere, and mark it removed so auto-confirm
 * won't bring it back.
 */
const isBlankRow = (row: DraftPackagingRow): boolean =>
  row.packSize === undefined && row.volumePerUnit === undefined && !row.barcode;

const isPositiveOrBlank = (value: number | undefined): boolean =>
  value === undefined || value > 0;

/**
 * A row holding a barcode was made on the Barcodes tab, which sets no volume
 * and only sometimes a pack size, so either may stay blank. Every other
 * entered row needs both.
 */
const isRowValid = (row: DraftPackagingRow): boolean =>
  row.barcode
    ? isPositiveOrBlank(row.packSize) && isPositiveOrBlank(row.volumePerUnit)
    : isBlankRow(row) ||
      ((row.packSize ?? 0) > 0 && (row.volumePerUnit ?? 0) > 0);

/**
 * ui-surface S3 — Save disabled until the name is set and every entered
 * packaging row has a POSITIVE pack size and volume per unit (rules.md's
 * "positive" requirement; the client-side mirror of the server's LessThanZero
 * guard). Blank rows are skipped; a row holding a barcode may leave either
 * blank.
 */
export const isFormValid = (form: DraftItemVariant): boolean =>
  form.name.trim() !== '' && form.packaging.every(isRowValid);

/**
 * The upsert input — always the FULL current field set: packagingVariants is
 * a full-replacement set (contract.md ⚠️ wire trap, rules.md § item variants
 * and packaging) — an omitted row is a deletion, so every save resends every
 * current row — except blank ones, which were never entered (so blanking an
 * existing row without a barcode removes it). A value left blank goes as null,
 * as the server stores it. `locationTypeId`/`manufacturerId`/`vvmType` are
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
  packagingVariants: form.packaging
    .filter(row => !isBlankRow(row))
    .map(row => ({
      id: row.id,
      name: row.name,
      packagingLevel: row.packagingLevel,
      packSize: row.packSize ?? null,
      volumePerUnit: row.volumePerUnit ?? null,
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
