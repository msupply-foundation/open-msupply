import { describe, expect, it } from 'vitest';
import {
  buildUpsertInput,
  EMPTY_FORM,
  formatRatio,
  invertRatio,
  isFormValid,
  isVariantDisabled,
  type DraftBundledItem,
} from './bundledItemEdit';
import type { ItemVariantRow } from './itemVariantEdit';

const PRINCIPAL_VARIANT_ID = 'principal-variant-1';

const candidateRow = (
  overrides: Partial<ItemVariantRow> = {}
): ItemVariantRow => ({
  id: 'candidate-1',
  name: 'Bottle of 500',
  itemId: 'other-item-1',
  itemName: 'Paracetamol',
  locationTypeId: null,
  locationType: null,
  manufacturerId: null,
  manufacturer: null,
  vvmType: null,
  packagingVariants: [],
  bundledItemVariants: [],
  bundlesWith: [],
  ...overrides,
});

// ui-surface S4 — Save disabled until a variant is chosen and the ratio is
// non-zero (rules.md: the server stores any ratio unvalidated, so this is a
// UI-only guard).
describe('isFormValid', () => {
  it('is invalid with no variant chosen', () => {
    expect(isFormValid(EMPTY_FORM)).toBe(false);
  });

  it('is invalid when the ratio is zero or blank', () => {
    const form: DraftBundledItem = {
      itemId: 'other-item-1',
      variantId: 'candidate-1',
      ratio: 0,
    };
    expect(isFormValid(form)).toBe(false);
    expect(isFormValid({ ...form, ratio: undefined })).toBe(false);
  });

  it('is valid with a variant chosen and a positive ratio', () => {
    expect(
      isFormValid({
        itemId: 'other-item-1',
        variantId: 'candidate-1',
        ratio: 1,
      })
    ).toBe(true);
  });
});

describe('buildUpsertInput', () => {
  it('carries the principal variant id, the chosen variant, and the ratio', () => {
    const form: DraftBundledItem = {
      itemId: 'other-item-1',
      variantId: 'candidate-1',
      ratio: 2.5,
    };
    expect(buildUpsertInput(form, PRINCIPAL_VARIANT_ID, 'bundle-1')).toEqual({
      id: 'bundle-1',
      principalItemVariantId: PRINCIPAL_VARIANT_ID,
      bundledItemVariantId: 'candidate-1',
      ratio: 2.5,
    });
  });
});

// rules.md § bundled variants — no nesting (either direction), no duplicate
// pair. The item-picker step already excludes the principal's own item, so
// isVariantDisabled only needs to guard the variant-selector step.
describe('isVariantDisabled', () => {
  it('is not disabled for a plain, unbundled candidate', () => {
    expect(isVariantDisabled(candidateRow(), [])).toBe(false);
  });

  it('is disabled when the candidate already bundles other variants (would-be principal)', () => {
    const candidate = candidateRow({
      bundledItemVariants: [
        {
          id: 'b1',
          ratio: 1,
          bundledItemVariantId: 'x',
          bundledItemVariant: null,
        },
      ],
    });
    expect(isVariantDisabled(candidate, [])).toBe(true);
  });

  it('is disabled when the candidate is already bundled onto another variant (the other nesting direction)', () => {
    const candidate = candidateRow({
      bundlesWith: [
        {
          id: 'b1',
          ratio: 1,
          principalItemVariantId: 'x',
          principalItemVariant: null,
        },
      ],
    });
    expect(isVariantDisabled(candidate, [])).toBe(true);
  });

  it("is disabled when the candidate is already one of this principal's bundled variants (duplicate pair)", () => {
    const candidate = candidateRow({ id: 'candidate-1' });
    expect(isVariantDisabled(candidate, ['candidate-1'])).toBe(true);
  });
});

describe('formatRatio / invertRatio', () => {
  it('formats the stored ratio, trimmed to 4 decimals', () => {
    expect(formatRatio(2)).toBe('2');
    expect(formatRatio(1.00001)).toBe('1');
  });

  it('inverts the ratio for the Bundled-on side', () => {
    expect(invertRatio(2)).toBe('0.5');
    expect(invertRatio(1)).toBe('1');
  });

  it("renders a zero (server-unvalidated) ratio's inverse as 0, not Infinity", () => {
    expect(invertRatio(0)).toBe('0');
  });
});
