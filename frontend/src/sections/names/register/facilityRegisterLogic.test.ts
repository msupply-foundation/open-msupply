import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_STATE,
  PAGE_SIZE_OPTIONS,
  REGISTER_FILTER,
  TEMPLATE_PAGE_SIZE,
  buildRegisterFilter,
  buildRegisterVariables,
  buildTemplateVariables,
  facilityRegisterPath,
  facilityStoreId,
  nextFacility,
  type FacilityRow,
} from './facilityRegisterLogic';

// Anchors: spec/names/cases/OMS-REG-MNG-02 (the facility register).
// The wire-shaped half of the register's behaviours — what the list asks the
// server for, and how the editor walks the page it got back. The rendered half
// (columns, markers, sort controls, empty state) is C4/C8 territory: no DOM
// harness exists in this repo, so those are listed as gaps in BUILD_REPORT.md.

const facility = (over: Partial<FacilityRow> = {}): FacilityRow => ({
  id: 'name-1',
  code: 'AAA',
  name: 'Aardvark Clinic',
  isSupplier: false,
  isCustomer: false,
  isDonor: false,
  isOnHold: false,
  store: { id: 'store-1', code: 'AAA', isDisabled: false },
  properties: '{}',
  ...over,
});

describe('OMS-REG-MNG-02.1 — the register lists all facilities on the server', () => {
  it('asks for names that are stores, and nothing else', () => {
    // The membership test is `isStore: true` alone — no role flag, no type
    // restriction, no visibility filter (contract § the entity and its three
    // lists). Anything more would narrow the register to a store's own
    // trading partners.
    expect(REGISTER_FILTER).toEqual({ isStore: true });
    expect(buildRegisterFilter({})).toEqual({ isStore: true });
  });
});

describe('OMS-REG-MNG-02.20 — the register is not store-scoped', () => {
  it('sends the same filter whichever store is active', () => {
    const state = { ...DEFAULT_STATE };
    const atTamaki = buildRegisterVariables({ storeId: 'tamaki', state });
    const atKopu = buildRegisterVariables({ storeId: 'kopu', state });

    // Only the authorisation subject differs; the filter — which decides the
    // ROW SET — is identical, so the signed-in store's own name is listed at
    // either store and the row set never changes.
    expect(atTamaki.filter).toEqual(atKopu.filter);
    expect(atTamaki.storeId).toBe('tamaki');
    expect(atKopu.storeId).toBe('kopu');
  });
});

describe('OMS-REG-MNG-02.26 — the register opens sorted by Name ascending', () => {
  it('defaults to a single name-ascending sort', () => {
    expect(DEFAULT_STATE.sort).toEqual([{ key: 'name', desc: false }]);
    // Only ONE sort key applies at a time (contract § sorting: the server
    // evaluates only the first entry).
    expect(DEFAULT_STATE.sort).toHaveLength(1);
  });
});

describe('OMS-REG-MNG-02.16 — a column header reorders the rows', () => {
  it('carries the chosen sort key and direction to the server', () => {
    const variables = buildRegisterVariables({
      storeId: 's',
      state: { ...DEFAULT_STATE, sort: [{ key: 'code', desc: true }] },
    });
    expect(variables.sort).toEqual([{ key: 'code', desc: true }]);
  });
});

describe('OMS-REG-MNG-02.27 — the search narrows by name or code', () => {
  it('sends the search as codeOrName alongside the membership test', () => {
    const variables = buildRegisterVariables({
      storeId: 's',
      state: { ...DEFAULT_STATE, filter: { codeOrName: { like: 'waih' } } },
    });
    // One field the server matches against BOTH code and name; the membership
    // test survives it.
    expect(variables.filter).toEqual({
      isStore: true,
      codeOrName: { like: 'waih' },
    });
  });

  it('drops an added-but-empty search chip from the query', () => {
    // `.5` — clearing the search restores the full list: an empty chip must
    // not travel as a real substring match ("" matches everything but the
    // server would still evaluate it).
    expect(buildRegisterFilter({ codeOrName: null })).toEqual({
      isStore: true,
    });
  });
});

describe('OMS-REG-MNG-02.17 — rows per page', () => {
  it('defaults to 20 and offers 10/20/50/100', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
    expect([...PAGE_SIZE_OPTIONS]).toEqual([10, 20, 50, 100]);
    expect(DEFAULT_STATE.first).toBe(20);
  });
});

describe('OMS-REG-MNG-02.18 / .19 — paging back and forth', () => {
  it('pages server-side by offset, carrying the page size', () => {
    const page2 = buildRegisterVariables({
      storeId: 's',
      state: { ...DEFAULT_STATE, offset: 20 },
    });
    expect(page2.page).toEqual({ first: 20, offset: 20 });
    const back = buildRegisterVariables({
      storeId: 's',
      state: { ...DEFAULT_STATE, offset: 0 },
    });
    expect(back.page).toEqual({ first: 20, offset: 0 });
  });
});

describe('OMS-REG-MNG-02.12 — the template covers every facility', () => {
  it('reads the register unpaginated, not the page on screen', () => {
    const variables = buildTemplateVariables('s');
    expect(variables.filter).toEqual({ isStore: true });
    expect(variables.page).toEqual({ first: TEMPLATE_PAGE_SIZE });
    // Captured as-is: there is no chunking on this read (README § captured
    // as-is — the template download is unpaginated).
    expect(TEMPLATE_PAGE_SIZE).toBeGreaterThan(1000);
  });
});

describe('OMS-REG-MNG-02.31 — save-and-move-on advances to the next row', () => {
  it('resolves "next" from the loaded page, in its current order', () => {
    const rows = [
      facility({ id: 'a' }),
      facility({ id: 'b' }),
      facility({ id: 'c' }),
    ];
    expect(nextFacility(rows, 'a')?.id).toBe('b');
    expect(nextFacility(rows, 'b')?.id).toBe('c');
  });
});

describe('OMS-REG-MNG-02.30 — the editor opens on the CHOSEN row', () => {
  it("resolves the edited row's own store, not the signed-in one", () => {
    const rows = [
      facility({
        id: 'a',
        store: { id: 'store-a', code: 'A', isDisabled: false },
      }),
      facility({
        id: 'b',
        store: { id: 'store-b', code: 'B', isDisabled: false },
      }),
    ];
    // The Preferences tab is per-STORE while the register is per-NAME, so the
    // editor needs the row's own store id. Handing it the entered store would
    // rewrite that store's preferences behind this facility's name.
    expect(facilityStoreId(rows, 'b')).toBe('store-b');
  });

  it('resolves nothing with no row open, or for a row off the page', () => {
    const rows = [facility({ id: 'a' })];
    expect(facilityStoreId(rows, undefined)).toBeUndefined();
    expect(facilityStoreId(rows, 'gone')).toBeUndefined();
  });
});

describe('OMS-REG-MNG-02.32 — save-and-move-on is unavailable on the last row', () => {
  it('has no next facility at the end of the loaded page', () => {
    const rows = [facility({ id: 'a' }), facility({ id: 'b' })];
    // The walk stops at the end of the PAGE, not the end of the register:
    // "next" is resolved client-side with no cursor and no extra request
    // (contract § the facility editor).
    expect(nextFacility(rows, 'b')).toBeUndefined();
  });

  it('has no next facility when nothing is open, or the row has gone', () => {
    const rows = [facility({ id: 'a' })];
    expect(nextFacility(rows, undefined)).toBeUndefined();
    expect(nextFacility(rows, 'not-in-the-list')).toBeUndefined();
    expect(nextFacility([], 'a')).toBeUndefined();
  });
});

describe('OMS-REG-MNG-02.6 — the register is reached under Manage', () => {
  it('routes to the store-relative manage/stores destination', () => {
    // The nav registry gates this destination on a central server; the route
    // itself carries no gate, because the read carries no requirement past
    // store access (rules § access).
    expect(facilityRegisterPath('store-1')).toBe('/store-1/manage/stores');
  });
});
