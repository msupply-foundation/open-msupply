import { describe, expect, it } from 'vitest';
import { CCE_CLASS_ID } from '../equipment';
import {
  DEFAULT_STATE,
  SORTABLE_KEYS,
  buildExportFilter,
  buildListVariables,
  clearTypeOnCategoryChange,
  clearTypeOutsideCategory,
  type EquipmentListState,
} from './listState';

const STORE = 'store-a';
const state = (over: Partial<EquipmentListState> = {}): EquipmentListState => ({
  ...DEFAULT_STATE,
  ...over,
});

describe('OMS-REG-CCE-07.13/.33 — what the CSV export reads', () => {
  it('carries the active filters, so the file matches the chips on screen', () => {
    const filtered = state({
      filter: { assetNumber: { like: 'FRIDGE' }, functionalStatus: null },
    });
    expect(buildExportFilter(filtered).assetNumber).toEqual({ like: 'FRIDGE' });
    // An added-but-empty chip is not a filter and must not reach the query.
    expect(buildExportFilter(filtered).functionalStatus).toBeUndefined();
  });

  it('pins the class, so an export is never widened past this register', () => {
    expect(buildExportFilter(state()).classId).toEqual({
      equalTo: CCE_CLASS_ID,
    });
  });

  it('drops the store restriction the LIST carries — every store is exported', () => {
    // The decision this register departs from the list-view standard on: the
    // cold-chain destination scopes the SCREEN to the active store, but an
    // export is a register-wide extract from either destination.
    expect(buildExportFilter(state()).storeId).toBeUndefined();
    expect(
      buildListVariables(state(), STORE, 'store').filter?.storeId
    ).toEqual({ equalTo: STORE });
  });
});

describe('OMS-REG-CCE-04.15 — only cold-chain-equipment assets are listed', () => {
  it('pins the class on every read, on both destinations', () => {
    for (const destination of ['store', 'all-stores'] as const) {
      const variables = buildListVariables(state(), STORE, destination);
      expect(variables.filter?.classId).toEqual({ equalTo: CCE_CLASS_ID });
    }
  });

  it('cannot be widened by a user filter — classId is merged in last', () => {
    // The user filter type has no classId key at all; even a hand-edited URL
    // carrying one is overwritten by the pinning.
    const rogue = state({
      filter: { classId: { equalTo: 'other' } } as never,
    });
    expect(buildListVariables(rogue, STORE, 'store').filter?.classId).toEqual({
      equalTo: CCE_CLASS_ID,
    });
  });
});

describe('OMS-REG-CCE-04.16 / .17 / OMS-REG-CCE-04.18 the destination decides the store scope', () => {
  it('pins Cold chain › Equipment to the active store', () => {
    const variables = buildListVariables(state(), STORE, 'store');
    expect(variables.filter?.storeId).toEqual({ equalTo: STORE });
  });

  it('sends NO store restriction on Manage › Equipment', () => {
    // Captured as-is: the manage destination lists every store's equipment,
    // and the server scopes nothing either (contract ⚠️ wire trap).
    const variables = buildListVariables(state(), STORE, 'all-stores');
    expect(variables.filter?.storeId).toBeUndefined();
  });

  it('still passes storeId as the operation argument — it is the auth scope', () => {
    expect(buildListVariables(state(), STORE, 'all-stores').storeId).toBe(
      STORE
    );
  });
});

describe('OMS-REG-CCE-04.19 — default order', () => {
  it('orders by installation date ascending, sent explicitly', () => {
    // Never left to the server: absent a sort it orders by id, a UUID.
    expect(DEFAULT_STATE.sort).toEqual([
      { key: 'installationDate', desc: false },
    ]);
  });

  it('sends exactly one sort entry, so first-vs-last cannot bite', () => {
    const variables = buildListVariables(state(), STORE, 'store');
    expect(variables.sort).toHaveLength(1);
  });
});

describe('OMS-REG-CCE-04.20 — the sortable set', () => {
  it('offers exactly asset number, serial number and installation date', () => {
    expect([...SORTABLE_KEYS]).toEqual([
      'assetNumber',
      'serialNumber',
      'installationDate',
    ]);
  });

  it('does not offer replacement date, which the reference screen cannot sort', () => {
    expect(SORTABLE_KEYS).not.toContain('replacementDate');
  });
});

describe('the four default filters are on the bar from arrival', () => {
  it('seeds status, category, asset number and serial as empty chips', () => {
    expect(Object.keys(DEFAULT_STATE.filter).sort()).toEqual([
      'assetNumber',
      'categoryId',
      'functionalStatus',
      'serialNumber',
    ]);
  });

  it('keeps an empty chip out of the query', () => {
    const variables = buildListVariables(state(), STORE, 'store');
    expect(variables.filter).not.toHaveProperty('assetNumber');
    expect(variables.filter).not.toHaveProperty('functionalStatus');
  });
});

describe('OMS-REG-CCE-04.5 / .21 / OMS-REG-CCE-04.24 / .9 a live filter reaches the query', () => {
  it('sends a text filter as a contains match', () => {
    const variables = buildListVariables(
      state({ filter: { assetNumber: { like: 'RSPEC' } } }),
      STORE,
      'store'
    );
    expect(variables.filter?.assetNumber).toEqual({ like: 'RSPEC' });
  });

  it('sends the functional status as an exact match', () => {
    const variables = buildListVariables(
      state({ filter: { functionalStatus: { equalTo: 'NOT_FUNCTIONING' } } }),
      STORE,
      'store'
    );
    expect(variables.filter?.functionalStatus).toEqual({
      equalTo: 'NOT_FUNCTIONING',
    });
  });

  it('sends the notes filter, which is added from the filter menu', () => {
    const variables = buildListVariables(
      state({ filter: { notes: { like: 'seeded' } } }),
      STORE,
      'store'
    );
    expect(variables.filter?.notes).toEqual({ like: 'seeded' });
  });
});

describe('OMS-REG-CCE-04.7 / .26 / OMS-REG-CCE-04.27 the non-catalogue filter has three answers', () => {
  const sent = (isNonCatalogue: boolean | null) =>
    buildListVariables(state({ filter: { isNonCatalogue } }), STORE, 'store')
      .filter;

  it('OMS-REG-CCE-04.7 asks for the assets with no catalogue item', () => {
    expect(sent(true)?.isNonCatalogue).toBe(true);
  });

  it('OMS-REG-CCE-04.26 asks for the ones that have one', () => {
    // `false` is a real answer here, not an absent filter — which is why the
    // chip cannot be a flag.
    expect(sent(false)?.isNonCatalogue).toBe(false);
  });

  it('OMS-REG-CCE-04.27 narrows nothing on All, without the chip being removed', () => {
    // An added-but-empty chip is `null`, and `stripEmpty` keeps it out of the
    // query — so the filter is absent, not `false`, which would be the
    // catalogue-only list.
    expect(sent(null)).not.toHaveProperty('isNonCatalogue');
  });
});

describe('OMS-REG-CCE-04.23 — changing the category clears the type', () => {
  /*
   * The interactive half, and why it cannot consult the type list: that list
   * is fetched FOR the category being left, so at the moment the category
   * changes it still describes the old one and would vouch for a type the new
   * category does not contain. The two filters are enough on their own.
   */
  it('clears the type when the category changes under it', () => {
    const next = clearTypeOnCategoryChange(
      { categoryId: { equalTo: 'cat-1' }, typeId: { equalTo: 'type-1' } },
      { categoryId: { equalTo: 'cat-2' }, typeId: { equalTo: 'type-1' } }
    );
    expect(next.typeId).toBeNull();
    expect(next.categoryId).toEqual({ equalTo: 'cat-2' });
  });

  it('leaves the type alone while the category holds still', () => {
    const filter = {
      categoryId: { equalTo: 'cat-1' },
      typeId: { equalTo: 'type-1' },
      notes: { like: 'x' },
    };
    expect(clearTypeOnCategoryChange({ ...filter, notes: null }, filter)).toBe(
      filter
    );
  });

  it('clears the type when the category is removed entirely', () => {
    const next = clearTypeOnCategoryChange(
      { categoryId: { equalTo: 'cat-1' }, typeId: { equalTo: 'type-1' } },
      { categoryId: null, typeId: { equalTo: 'type-1' } }
    );
    expect(next.typeId).toBeNull();
  });

  it('has nothing to clear when no type is chosen', () => {
    const filter = { categoryId: { equalTo: 'cat-2' } };
    expect(
      clearTypeOnCategoryChange({ categoryId: { equalTo: 'cat-1' } }, filter)
    ).toBe(filter);
  });
});

describe('OMS-REG-CCE-04.23 — a type outside the chosen category is cleared', () => {
  const TYPES = [{ id: 'type-1' }, { id: 'type-2' }];

  it('clears a type the category does not contain', () => {
    const next = clearTypeOutsideCategory(
      { typeId: { equalTo: 'type-9' } },
      TYPES
    );
    expect(next.typeId).toBeNull();
  });

  it('keeps a type the category does contain', () => {
    const filter = { typeId: { equalTo: 'type-2' } };
    expect(clearTypeOutsideCategory(filter, TYPES)).toBe(filter);
  });

  it('does not clear while the type list is still loading', () => {
    // An empty list is "not loaded yet", not "contains nothing" — clearing on
    // it would silently drop a filter the URL carries.
    const filter = { typeId: { equalTo: 'type-2' } };
    expect(clearTypeOutsideCategory(filter, [])).toBe(filter);
  });

  it('leaves a filter with no type alone', () => {
    const filter = { categoryId: { equalTo: 'cat-1' } };
    expect(clearTypeOutsideCategory(filter, TYPES)).toBe(filter);
  });
});

describe('rules § reading the list — pagination', () => {
  it('never asks for fewer than one row', () => {
    const variables = buildListVariables(state(), STORE, 'store');
    expect(variables.page?.first).toBeGreaterThanOrEqual(1);
  });

  it('carries the offset the list is showing', () => {
    const variables = buildListVariables(
      state({ offset: 40, first: 20 }),
      STORE,
      'store'
    );
    expect(variables.page).toEqual({ first: 20, offset: 40 });
  });
});
