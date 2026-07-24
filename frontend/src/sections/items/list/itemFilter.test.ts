import { describe, expect, it } from 'vitest';
import {
  buildDynamicFilter,
  buildItemFilter,
  customFieldConditions,
  expandLens,
} from './itemFilter';

describe('itemFilter — list population & filters (spec/items S1)', () => {
  // AC-L1 — default population is the store's stock-type catalogue: active,
  // stock-type, visible-or-on-hand, with no lens.
  it('AC-L1: default population = active ∧ STOCK ∧ visible-or-on-hand', () => {
    const f = buildItemFilter({});
    expect(f.isActive).toBe(true);
    expect(f.type).toEqual({ equalTo: 'STOCK' });
    expect(f.isVisibleOrOnHand).toBe(true);
    // non-stock types never appear; the client never sends a NON_STOCK/SERVICE type
    expect(f.type?.equalTo).toBe('STOCK');
  });

  // AC-L2 — the stock-status lens REPLACES the visible-or-on-hand population.
  // Encodes the two wire traps: isVisibleOrOnHand is dropped when a lens is
  // active, and withRecentConsumption is only ever set true (never false).
  it('AC-L2: each lens expands correctly and drops isVisibleOrOnHand', () => {
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

  // AC-L3 — code-or-name search narrows by code OR name, combining with the
  // rest (the base filter stays present).
  it('AC-L3: code-or-name search combines with the base filter', () => {
    const f = buildItemFilter({ codeOrName: 'amox' });
    expect(f.codeOrName).toEqual({ like: 'amox' });
    expect(f.isActive).toBe(true);
    expect(f.isVisibleOrOnHand).toBe(true);
    // blank search is not applied
    expect(buildItemFilter({ codeOrName: '' }).codeOrName).toBeUndefined();
  });

  // AC-L4 — months-of-stock bounds pass straight through (the server applies
  // them as strictly-exclusive, zero-AMC-excluding narrowings).
  it('AC-L4: min/max months of stock pass through, combining', () => {
    const f = buildItemFilter({ minMonthsOfStock: 1, maxMonthsOfStock: 6 });
    expect(f.minMonthsOfStock).toBe(1);
    expect(f.maxMonthsOfStock).toBe(6);
    // a zero bound is a real bound (0 is exclusive server-side), not "unset"
    expect(buildItemFilter({ minMonthsOfStock: 0 }).minMonthsOfStock).toBe(0);
  });

  // AC-L5 — at-risk filter maps to the boolean (show-at-risk = true,
  // show-not-at-risk = false); absent when not added.
  it('AC-L5: at-risk maps to productsAtRiskOfBeingOutOfStock', () => {
    expect(
      buildItemFilter({ atRisk: 'at-risk' }).productsAtRiskOfBeingOutOfStock
    ).toBe(true);
    expect(
      buildItemFilter({ atRisk: 'not-at-risk' }).productsAtRiskOfBeingOutOfStock
    ).toBe(false);
    expect(buildItemFilter({}).productsAtRiskOfBeingOutOfStock).toBeUndefined();
  });

  // AC-L6 — master-list filter narrows to one chosen list.
  it('AC-L6: master-list filter maps to masterListId.equalTo', () => {
    expect(buildItemFilter({ masterListId: 'ml-1' }).masterListId).toEqual({
      equalTo: 'ml-1',
    });
    expect(buildItemFilter({ masterListId: '' }).masterListId).toBeUndefined();
  });
});

describe('itemFilter — custom-field property filters (spec/items AC-P2)', () => {
  // AC-P2 — one filter per definition, typed by value type; several combine as
  // AND with each other and everything else.
  it('AC-P2: text → Like', () => {
    expect(
      customFieldConditions('k', { type: 'TEXT', contains: 'abc' })
    ).toEqual([
      { CustomField: { key: 'k', filter: { Text: { Like: 'abc' } } } },
    ]);
    expect(customFieldConditions('k', { type: 'TEXT', contains: '' })).toEqual(
      []
    );
  });

  it('AC-P2: boolean → Equal (yes/no)', () => {
    expect(
      customFieldConditions('k', { type: 'BOOLEAN', value: true })
    ).toEqual([
      { CustomField: { key: 'k', filter: { Boolean: { Equal: true } } } },
    ]);
  });

  it('AC-P2: option → In with parent + descendants', () => {
    expect(
      customFieldConditions('k', {
        type: 'OPTION',
        optionIds: ['parent', 'childA', 'childB'],
      })
    ).toEqual([
      {
        CustomField: {
          key: 'k',
          filter: { Option: { In: ['parent', 'childA', 'childB'] } },
        },
      },
    ]);
  });

  it('AC-P2: number → range expands to two >= / <= nodes', () => {
    expect(
      customFieldConditions('k', { type: 'INTEGER', min: 2, max: 9 })
    ).toEqual([
      {
        CustomField: {
          key: 'k',
          filter: { Number: { GreaterThanOrEqual: 2 } },
        },
      },
      {
        CustomField: { key: 'k', filter: { Number: { LowerThanOrEqual: 9 } } },
      },
    ]);
  });

  it('AC-P2: multiple property filters combine under a single And', () => {
    const dyn = buildDynamicFilter({
      colour: { type: 'TEXT', contains: 'red' },
      refrigerated: { type: 'BOOLEAN', value: true },
    }) as { And: unknown[] };
    expect(dyn.And).toHaveLength(2);
    // and they land on the wire filter alongside the base filter
    const f = buildItemFilter({
      customFields: { refrigerated: { type: 'BOOLEAN', value: true } },
    });
    expect(f.dynamicFilter).toEqual({
      And: [
        {
          CustomField: {
            key: 'refrigerated',
            filter: { Boolean: { Equal: true } },
          },
        },
      ],
    });
    // no custom filters → no dynamicFilter key at all
    expect(buildItemFilter({}).dynamicFilter).toBeUndefined();
  });
});
