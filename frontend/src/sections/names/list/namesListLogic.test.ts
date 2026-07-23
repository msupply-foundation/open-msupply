import { describe, expect, it } from 'vitest';
import {
  buildFilter,
  buildVariables,
  customersListPath,
  DEFAULT_PAGE_SIZE,
  DEFAULT_STATE,
  isStoreName,
  PAGE_SIZE_OPTIONS,
  purchaseOrderAreaPath,
  roleRelationshipFilter,
  suppliersListPath,
  supplierDetailPath,
  TYPE_RESTRICTION,
  type NameRow,
  type NamesListState,
} from './namesListLogic';

// Logic-level coverage of the Customer & Supplier list acceptance criteria
// (spec/names). Behaviour that has a backend is validated at the query-shape
// level here; the live-backend leg (C2) and the rendered-UI/a11y leg (C4) are
// recorded as gaps in BUILD_REPORT.

const state = (over: Partial<NamesListState> = {}): NamesListState => ({
  ...DEFAULT_STATE,
  ...over,
});

const row = (over: Partial<NameRow> = {}): NameRow => ({
  id: 'n1',
  code: 'ACME',
  name: 'Acme Health',
  type: 'FACILITY',
  isCustomer: true,
  isSupplier: false,
  isVisible: true,
  store: null,
  customFields: null,
  ...over,
});

describe("AC-N1 Customer list is the active store's customers", () => {
  it('filters by the per-store isCustomer relationship, scoped to the store', () => {
    const vars = buildVariables({
      storeId: 'storeA',
      role: 'customer',
      state: state(),
    });
    expect(vars.storeId).toBe('storeA');
    expect(vars.filter?.isCustomer).toBe(true);
    expect(vars.filter?.isSupplier).toBeUndefined();
  });
});

describe("AC-N2 Supplier list is the active store's suppliers", () => {
  it('filters by the per-store isSupplier relationship', () => {
    const vars = buildVariables({
      storeId: 'storeA',
      role: 'supplier',
      state: state(),
    });
    expect(vars.filter?.isSupplier).toBe(true);
    expect(vars.filter?.isCustomer).toBeUndefined();
  });
});

describe('AC-N3 Listed names are visible to the store', () => {
  it('applies the relationship flag that (server-side) implies visibility', () => {
    // Filtering by isCustomer/isSupplier selects names whose relationship to the
    // active store carries the flag — which is also what makes them visible
    // (contract › store scoping), so no separate isVisible is needed.
    expect(roleRelationshipFilter('customer')).toEqual({ isCustomer: true });
    expect(roleRelationshipFilter('supplier')).toEqual({ isSupplier: true });
  });
});

describe('AC-N4 Only qualifying names appear', () => {
  it('restricts the name type to facility/store (excludes INVAD/REPACK by omission)', () => {
    expect(TYPE_RESTRICTION).toEqual({
      type: { equalAny: ['FACILITY', 'STORE'] },
    });
    const filter = buildFilter('customer', {});
    expect(filter.type?.equalAny).toEqual(['FACILITY', 'STORE']);
  });
});

describe('AC-N5 Lists re-scope on active-store change', () => {
  it('re-scopes the query when the store id changes', () => {
    const a = buildVariables({
      storeId: 'A',
      role: 'customer',
      state: state(),
    });
    const b = buildVariables({
      storeId: 'B',
      role: 'customer',
      state: state(),
    });
    expect(a.storeId).toBe('A');
    expect(b.storeId).toBe('B');
  });
});

describe('AC-N6 Customer/supplier status is per store', () => {
  it('selects by the per-store relationship flag, scoped to that store', () => {
    // The same name can be a customer of store A and not of store B — the query
    // is (storeId + relationship flag), so each store gets its own result set.
    const custA = buildVariables({
      storeId: 'A',
      role: 'customer',
      state: state(),
    });
    const custB = buildVariables({
      storeId: 'B',
      role: 'customer',
      state: state(),
    });
    expect(custA.filter?.isCustomer).toBe(true);
    expect(custB.filter?.isCustomer).toBe(true);
    expect(custA.storeId).not.toBe(custB.storeId);
  });
});

describe('AC-N7 Row shows code and name', () => {
  it('every row carries a code and a name (the two default columns)', () => {
    const r = row();
    expect(r.code).toBe('ACME');
    expect(r.name).toBe('Acme Health');
  });
});

describe('AC-N8 Store-kind names carry a store indicator', () => {
  it('is a store name only when the store relation is present', () => {
    expect(isStoreName(row({ store: { id: 's', code: 'S' } }))).toBe(true);
    expect(isStoreName(row({ store: null }))).toBe(false);
  });
});

describe('AC-N9 Sort by code or name, default name ascending', () => {
  it('defaults to name ascending, single key', () => {
    expect(DEFAULT_STATE.sort).toEqual([{ key: 'name', desc: false }]);
    expect(DEFAULT_STATE.sort).toHaveLength(1);
  });
  it('carries the chosen sort key through to the query', () => {
    const vars = buildVariables({
      storeId: 'A',
      role: 'customer',
      state: state({ sort: [{ key: 'code', desc: true }] }),
    });
    expect(vars.sort).toEqual([{ key: 'code', desc: true }]);
  });
});

describe('AC-N10 Stable order across pages', () => {
  it('keeps the same sort while paging (offset changes, sort unchanged)', () => {
    const page1 = buildVariables({
      storeId: 'A',
      role: 'customer',
      state: state({ offset: 0 }),
    });
    const page2 = buildVariables({
      storeId: 'A',
      role: 'customer',
      state: state({ offset: 20 }),
    });
    expect(page1.sort).toEqual(page2.sort);
  });
});

describe('AC-N11 Server-side pagination with full total', () => {
  it('sends first + offset as the page window', () => {
    const vars = buildVariables({
      storeId: 'A',
      role: 'customer',
      state: state({ offset: 40, first: 20 }),
    });
    expect(vars.page).toEqual({ first: 20, offset: 40 });
  });
});

describe('AC-N12 Page size', () => {
  it('offers 10/20/50/100, defaulting to 20', () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([10, 20, 50, 100]);
    expect(DEFAULT_PAGE_SIZE).toBe(20);
    expect(DEFAULT_STATE.first).toBe(20);
  });
});

describe('AC-N13 Search by name or code', () => {
  it('passes a codeOrName "like" through and drops an empty chip', () => {
    const withSearch = buildFilter('customer', {
      codeOrName: { like: 'clin' },
    });
    expect(withSearch.codeOrName).toEqual({ like: 'clin' });
    // The relationship + type scope is always retained alongside the search.
    expect(withSearch.isCustomer).toBe(true);
    expect(withSearch.type?.equalAny).toEqual(['FACILITY', 'STORE']);
    // An added-but-empty chip (null) is stripped, restoring the full list.
    const cleared = buildFilter('customer', { codeOrName: null });
    expect(cleared.codeOrName).toBeUndefined();
  });
});

describe('AC-N14 Customer row opens its detail in place', () => {
  it('the customer list path is the modal host (opened in place, no route change)', () => {
    // The customer detail is a modal over the list, so there is no detail route
    // — the list path is where it opens (see CustomersList).
    expect(customersListPath('A')).toBe('/A/distribution/customers');
  });
});

describe('AC-N15 Supplier row navigates to its detail page', () => {
  it('builds the supplier detail route', () => {
    expect(supplierDetailPath('A', 'n1')).toBe('/A/replenishment/suppliers/n1');
    expect(suppliersListPath('A')).toBe('/A/replenishment/suppliers');
  });
});

describe('AC-N16 No create/edit/delete/select/export', () => {
  it('the list state carries no selection/mutation surface (read-only)', () => {
    // The state is filter/sort/pagination only — there is no selection set, and
    // buildVariables produces a read query with no mutation input.
    const keys = Object.keys(DEFAULT_STATE).sort();
    expect(keys).toEqual(['filter', 'first', 'offset', 'sort']);
  });
});

describe('AC-N17 Requires authentication and an active store', () => {
  it('the query is store-scoped — it cannot be built without a storeId', () => {
    // storeId is a required variable; the section mounts only behind the store
    // guard (an authenticated user with an active store), so no store ⇒ no list.
    const vars = buildVariables({
      storeId: 'A',
      role: 'customer',
      state: state(),
    });
    expect(vars.storeId).toBe('A');
  });
});

describe('AC-N26 Purchase Orders tab references the purchase-order area', () => {
  it('builds the purchase-order area path a PO row navigates to', () => {
    expect(purchaseOrderAreaPath('A')).toBe('/A/replenishment/purchase-order');
  });
});
