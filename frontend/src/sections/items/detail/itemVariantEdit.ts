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
  /**
   * The name the row had when the form opened (its seeded label, or its saved
   * name). Renaming a row enters it (isBlankRow); never sent.
   */
  initialName: string;
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

const blankRow = (
  packagingLevel: number,
  labelKey: LocaleKey
): DraftPackagingRow => {
  const name = t(labelKey);
  return {
    id: generateUUID(),
    name,
    packagingLevel,
    packSize: undefined,
    volumePerUnit: undefined,
    initialName: name,
  };
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
    initialName: row.name,
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
 * A row with no pack size, no volume, no barcode and the name it opened with
 * hasn't been entered: the seeded rows are "a starting point, not a rule"
 * (rules.md § item variants and packaging), so a blank one is left out of the
 * save rather than blocking it (OMS-REG-CAT-05.21). Renaming a row enters it,
 * so it's checked rather than silently dropped (OMS-REG-CAT-05.32); clearing
 * the name of an otherwise blank row, or adding spaces to it, doesn't. So a
 * saved row with no name and no values is blank too, and a save removes it.
 * A row holding a barcode is never blank: leaving it out would delete the
 * barcode everywhere, and mark it removed so auto-confirm won't bring it back.
 */
const isBlankRow = (row: DraftPackagingRow): boolean =>
  row.packSize === undefined &&
  row.volumePerUnit === undefined &&
  !row.barcode &&
  (row.name.trim() === '' || row.name.trim() === row.initialName.trim());

/** Each invalid cell of a packaging row, with the message it shows. */
export type PackagingRowErrors = Partial<
  Record<'name' | 'packSize' | 'volumePerUnit', string>
>;

/**
 * A value must be positive (rules.md's positive-values rule, the client-side
 * mirror of the server's LessThanZero guard). A row holding a barcode was made
 * on the Barcodes tab, which sets no volume and only sometimes a pack size, so
 * there either may stay blank; every other entered row needs both.
 */
const valueError = (
  value: number | undefined,
  blankAllowed: boolean
): string | undefined => {
  if (value === undefined)
    return blankAllowed ? undefined : t('error.field-required');
  return value > 0 ? undefined : t('error.must-be-greater-than-zero');
};

/**
 * ui-surface S3 — the cells of an entered packaging row that block Save, each
 * flagged in the grid with why (OMS-REG-CAT-05.31, .32): a name that isn't
 * blank, and a positive pack size and volume per unit. A blank row has none.
 */
export const packagingRowErrors = (
  row: DraftPackagingRow
): PackagingRowErrors => {
  if (isBlankRow(row)) return {};
  const errors: PackagingRowErrors = {};
  if (row.name.trim() === '') errors.name = t('error.field-required');
  const packSize = valueError(row.packSize, !!row.barcode);
  if (packSize) errors.packSize = packSize;
  const volumePerUnit = valueError(row.volumePerUnit, !!row.barcode);
  if (volumePerUnit) errors.volumePerUnit = volumePerUnit;
  return errors;
};

/**
 * ui-surface S3 — Save disabled until the name is set and no packaging row has
 * an invalid cell (packagingRowErrors). Blank rows are skipped.
 */
export const isFormValid = (form: DraftItemVariant): boolean =>
  form.name.trim() !== '' &&
  form.packaging.every(
    row => Object.keys(packagingRowErrors(row)).length === 0
  );

/**
 * The upsert input — always the FULL current field set: packagingVariants is
 * a full-replacement set (contract.md ⚠️ wire trap, rules.md § item variants
 * and packaging) — an omitted row is a deletion, so every save resends every
 * current row — except blank ones, which were never entered (so blanking an
 * existing row's values without a barcode, keeping its name, removes it). A
 * value left blank goes as null, as the server stores it. `locationTypeId`/`manufacturerId`/`vvmType` are
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
