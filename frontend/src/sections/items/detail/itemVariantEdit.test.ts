import { describe, expect, it } from 'vitest';
import {
  buildUpsertInput,
  emptyForm,
  formFromVariant,
  isFormValid,
  rejectionMessage,
  saveRejection,
  type DraftItemVariant,
  type ItemVariantRow,
} from './itemVariantEdit';

const ITEM_ID = 'item-1';

const variantRow = (
  overrides: Partial<ItemVariantRow> = {}
): ItemVariantRow => ({
  id: 'variant-1',
  name: 'Bottle of 100',
  itemId: ITEM_ID,
  itemName: 'Amoxicillin',
  locationTypeId: 'loc-type-1',
  locationType: {
    id: 'loc-type-1',
    name: 'Cold room',
    minTemperature: 2,
    maxTemperature: 8,
  },
  manufacturerId: 'manufacturer-1',
  manufacturer: { id: 'manufacturer-1', name: 'Acme Pharma' },
  vvmType: 'VVM30',
  packagingVariants: [
    {
      id: 'pv-1',
      name: 'Primary',
      packagingLevel: 1,
      packSize: 1,
      volumePerUnit: 0.5,
    },
  ],
  bundledItemVariants: [],
  bundlesWith: [],
  ...overrides,
});

// ui-surface S3 — a new variant seeds three packaging rows (Primary/
// Secondary/Tertiary at levels 1/2/3, rules.md § item variants and packaging).
describe('emptyForm', () => {
  it('seeds three packaging rows at levels 1/2/3 with blank pack size/volume', () => {
    const form = emptyForm();
    expect(form.name).toBe('');
    expect(form.packaging).toHaveLength(3);
    expect(form.packaging.map(row => row.packagingLevel)).toEqual([1, 2, 3]);
    expect(form.packaging.every(row => row.packSize === undefined)).toBe(true);
    expect(form.packaging.every(row => row.volumePerUnit === undefined)).toBe(
      true
    );
    // Every seeded row gets its own client-generated id (full-replacement
    // packaging semantics need a real identity from the first save).
    expect(new Set(form.packaging.map(row => row.id)).size).toBe(3);
  });
});

describe('formFromVariant', () => {
  it('seeds every field from the row, including its existing packaging', () => {
    const row = variantRow();
    expect(formFromVariant(row)).toEqual({
      name: 'Bottle of 100',
      locationTypeId: 'loc-type-1',
      manufacturerId: 'manufacturer-1',
      vvmType: 'VVM30',
      packaging: [
        {
          id: 'pv-1',
          name: 'Primary',
          packagingLevel: 1,
          packSize: 1,
          volumePerUnit: 0.5,
        },
      ],
    });
  });

  it("treats null location type/manufacturer/vvm as none ('')", () => {
    const row = variantRow({
      locationTypeId: null,
      locationType: null,
      manufacturerId: null,
      manufacturer: null,
      vvmType: null,
    });
    const form = formFromVariant(row);
    expect(form.locationTypeId).toBe('');
    expect(form.manufacturerId).toBe('');
    expect(form.vvmType).toBe('');
  });
});

const validForm = (): DraftItemVariant => ({
  name: 'Bottle of 100',
  locationTypeId: '',
  manufacturerId: '',
  vvmType: '',
  packaging: [
    {
      id: 'pv-1',
      name: 'Primary',
      packagingLevel: 1,
      packSize: 1,
      volumePerUnit: 0.5,
    },
  ],
});

// ui-surface S3 — Save disabled until the name is set and every packaging row
// has a positive pack size and volume per unit (rules.md's positive-values
// rule, the client mirror of the server's LessThanZero guard).
describe('isFormValid', () => {
  it('is invalid with no name', () => {
    expect(isFormValid({ ...validForm(), name: '' })).toBe(false);
    expect(isFormValid({ ...validForm(), name: '   ' })).toBe(false);
  });

  it('is invalid when a packaging row has a blank or zero pack size', () => {
    const form = validForm();
    form.packaging[0].packSize = undefined;
    expect(isFormValid(form)).toBe(false);
    form.packaging[0].packSize = 0;
    expect(isFormValid(form)).toBe(false);
  });

  it('is invalid when a packaging row has a blank or zero volume per unit', () => {
    const form = validForm();
    form.packaging[0].volumePerUnit = 0;
    expect(isFormValid(form)).toBe(false);
  });

  it('is valid with a name and every packaging row positive', () => {
    expect(isFormValid(validForm())).toBe(true);
  });
});

describe('buildUpsertInput', () => {
  it('wraps location type/manufacturer/vvm as NullableStringUpdate, and full-replaces packaging', () => {
    const form: DraftItemVariant = {
      name: 'Bottle of 100',
      locationTypeId: 'loc-type-1',
      manufacturerId: 'manufacturer-1',
      vvmType: 'VVM30',
      packaging: [
        {
          id: 'pv-1',
          name: 'Primary',
          packagingLevel: 1,
          packSize: 1,
          volumePerUnit: 0.5,
        },
      ],
    };
    expect(buildUpsertInput(form, ITEM_ID, 'variant-1')).toEqual({
      id: 'variant-1',
      itemId: ITEM_ID,
      name: 'Bottle of 100',
      locationTypeId: { value: 'loc-type-1' },
      manufacturerId: { value: 'manufacturer-1' },
      vvmType: { value: 'VVM30' },
      packagingVariants: [
        {
          id: 'pv-1',
          name: 'Primary',
          packagingLevel: 1,
          packSize: 1,
          volumePerUnit: 0.5,
        },
      ],
    });
  });

  it('sends null (not omitted) to clear an unset location type/manufacturer/vvm', () => {
    const input = buildUpsertInput(validForm(), ITEM_ID, 'variant-1');
    expect(input.locationTypeId).toEqual({ value: null });
    expect(input.manufacturerId).toEqual({ value: null });
    expect(input.vvmType).toEqual({ value: null });
  });
});

// ui-surface S3/S6 — a duplicate name gets its own copy; DatabaseError/
// InternalError (vestigial here, contract.md) fall back to the generic
// failure message.
describe('saveRejection / rejectionMessage', () => {
  it('maps a name UniqueValueViolation to duplicateName', () => {
    const rejection = saveRejection({
      __typename: 'UniqueValueViolation',
      field: 'name',
      description: 'Duplicate',
    });
    expect(rejection).toEqual({ kind: 'duplicateName' });
    // No dictionary is loaded in this test environment — t() falls back to
    // the key itself (same convention as ancillaryItemEdit.test.ts).
    expect(rejectionMessage(rejection)).toBe(
      'error.duplicate-item-variant-name'
    );
  });

  it('falls back to the generic failure message for DatabaseError/InternalError', () => {
    const rejection = saveRejection({
      __typename: 'InternalError',
      description: 'Something broke server-side',
    });
    expect(rejection).toEqual({ kind: 'other' });
    expect(rejectionMessage(rejection)).toBe(
      'error.failed-to-save-item-variant'
    );
  });
});
