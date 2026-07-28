import { describe, expect, it } from 'vitest';
import { buildItemFilter, expandLens } from './itemFilter';

describe('itemFilter — list population & filters (spec/items S1)', () => {
  // OMS-REG-CAT-04.25 — default population is the store's stock-type
  // catalogue: active, stock-type, visible-or-on-hand, with no lens.
  it('default population = active ∧ STOCK ∧ visible-or-on-hand (CAT-04.25)', () => {
    const f = buildItemFilter({});
    expect(f.isActive).toBe(true);
    expect(f.type).toEqual({ equalTo: 'STOCK' });
    expect(f.isVisibleOrOnHand).toBe(true);
    // non-stock types never appear; the client never sends a NON_STOCK/SERVICE type
    expect(f.type?.equalTo).toBe('STOCK');
  });

  // OMS-REG-CAT-04.26 — the stock-status lens REPLACES the visible-or-on-hand
  // population. Encodes the two wire traps: isVisibleOrOnHand is dropped when
  // a lens is active, and withRecentConsumption is only ever set true (never
  // false).
  it('each lens expands correctly and drops isVisibleOrOnHand (CAT-04.26)', () => {
    expect(expandLens('in-stock')).toEqual({ hasStockOnHand: true });
    expect(expandLens('in-stock-recent')).toEqual({
      hasStockOnHand: true,
      withRecentConsumption: true,
    });
    expect(expandLens('out-of-stock')).toEqual({
      hasStockOnHand: false,
      isVisible: true,
    });
    expect(expandLens('out-of-stock-recent')).toEqual({
      hasStockOnHand: false,
      withRecentConsumption: true,
    });

    const inStock = buildItemFilter({ lens: 'in-stock' });
    expect(inStock.hasStockOnHand).toBe(true);
    expect(inStock.isVisibleOrOnHand).toBeUndefined();
    // exactly one lens applies at a time — only its fields are present
    expect(inStock.withRecentConsumption).toBeUndefined();
  });

  // OMS-REG-CAT-04.5/.6/.27 — code-or-name search narrows by code OR name,
  // combining with the rest (the base filter stays present).
  it('code-or-name search combines with the base filter (CAT-04.5/.6/.27)', () => {
    const f = buildItemFilter({ codeOrName: 'amox' });
    expect(f.codeOrName).toEqual({ like: 'amox' });
    expect(f.isActive).toBe(true);
    expect(f.isVisibleOrOnHand).toBe(true);
    // blank search is not applied
    expect(buildItemFilter({ codeOrName: '' }).codeOrName).toBeUndefined();
  });

  // OMS-REG-CAT-04.28 — months-of-stock bounds pass straight through (the
  // server applies them as strictly-exclusive, zero-AMC-excluding narrowings).
  it('min/max months of stock pass through, combining (CAT-04.28)', () => {
    const f = buildItemFilter({ minMonthsOfStock: 1, maxMonthsOfStock: 6 });
    expect(f.minMonthsOfStock).toBe(1);
    expect(f.maxMonthsOfStock).toBe(6);
    // a zero bound is a real bound (0 is exclusive server-side), not "unset"
    expect(buildItemFilter({ minMonthsOfStock: 0 }).minMonthsOfStock).toBe(0);
  });

  // OMS-REG-CAT-04.29 — at-risk filter maps to the boolean (show-at-risk =
  // true, show-not-at-risk = false); absent when not added.
  it('at-risk maps to productsAtRiskOfBeingOutOfStock (CAT-04.29)', () => {
    expect(
      buildItemFilter({ atRisk: 'at-risk' }).productsAtRiskOfBeingOutOfStock
    ).toBe(true);
    expect(
      buildItemFilter({ atRisk: 'not-at-risk' }).productsAtRiskOfBeingOutOfStock
    ).toBe(false);
    expect(buildItemFilter({}).productsAtRiskOfBeingOutOfStock).toBeUndefined();
  });

  // OMS-REG-CAT-04.30 — master-list filter narrows to one chosen list.
  it('master-list filter maps to masterListId.equalTo (CAT-04.30)', () => {
    expect(buildItemFilter({ masterListId: 'ml-1' }).masterListId).toEqual({
      equalTo: 'ml-1',
    });
    expect(buildItemFilter({ masterListId: '' }).masterListId).toBeUndefined();
  });
});

// The custom-field property filter → dynamicFilter AST is now the shared
// domain/customFields logic (see its customFields.test.ts); the item list wires
// that group separately, so itemFilter no longer owns it.
