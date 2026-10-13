import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REGISTER_STATE,
  SORTABLE_COLUMNS,
  hasActiveFilter,
  reportVariables,
} from './reportRegister';

// Anchors: spec/manage-reports/cases/OMS-REG-MNG-06.
//   .2 — inactive versions are listed alongside active ones
//   .3 — the same rows appear whichever store the reader is in
//   .4 — sorting by version orders textually
//   .5 — name and code are the only filters; active state cannot be filtered
// The register's read is pure state → variables, so the wire traps it steers
// around (contract.md § the register) are pinned here rather than by driving
// the screen. What is testable at this layer is what the client SENDS.

const state = DEFAULT_REGISTER_STATE;

describe('OMS-REG-MNG-06.2 — inactive versions are listed too', () => {
  it('sends no isActive filter, so the register is never narrowed to active', () => {
    const variables = reportVariables('store-a', 'en', state);
    expect(variables.filter).toBeUndefined();
  });

  it('still sends no isActive filter when a name search is active', () => {
    const variables = reportVariables('store-a', 'en', {
      ...state,
      filter: { name: { like: 'stock' } },
    });
    expect(variables.filter).toEqual({ name: { like: 'stock' } });
    expect(variables.filter?.isActive).toBeUndefined();
  });
});

describe('OMS-REG-MNG-06.3 — the row set does not vary by store', () => {
  it('sends storeId but never uses it as a filter', () => {
    const a = reportVariables('store-a', 'en', state);
    const b = reportVariables('store-b', 'en', state);
    expect(a.storeId).toBe('store-a');
    expect(b.storeId).toBe('store-b');
    // Everything that shapes the ROW SET is identical between the two.
    expect({ ...a, storeId: undefined }).toEqual({ ...b, storeId: undefined });
  });
});

describe('sort — one entry, passed through to the server (contract § the register)', () => {
  it('defaults to a single code-ascending sort entry', () => {
    expect(state.sort).toEqual([{ key: 'code', desc: false }]);
  });

  it('sends the version key as-is, with no client-side re-sort', () => {
    const variables = reportVariables('store-a', 'en', {
      ...state,
      sort: [{ key: 'version', desc: true }],
    });
    expect(variables.sort).toEqual([{ key: 'version', desc: true }]);
  });

  it('sends EXACTLY ONE sort entry — the resolver applies the LAST of the list', () => {
    // A stale or hand-edited URL could carry more than one entry. Passing them
    // through would silently sort by whichever ended up last (contract.md
    // ⚠️ wire trap).
    const variables = reportVariables('store-a', 'en', {
      ...state,
      sort: [
        { key: 'name', desc: false },
        { key: 'version', desc: true },
      ],
    });
    expect(variables.sort).toEqual([{ key: 'name', desc: false }]);
  });

  it('offers sort on name, code and version only', () => {
    // Status and Custom have no server sort key, so no column can name one.
    expect([...SORTABLE_COLUMNS]).toEqual(['name', 'code', 'version']);
  });
});

describe('OMS-REG-MNG-06.5 — an empty filter is not sent', () => {
  it('treats an empty filter object as no filter', () => {
    expect(hasActiveFilter({})).toBe(false);
    expect(reportVariables('store-a', 'en', state).filter).toBeUndefined();
  });

  it('treats a cleared member as no filter', () => {
    // Clearing a search box writes null, which must not count as narrowing —
    // otherwise the register would look filtered with every box empty.
    expect(hasActiveFilter({ name: null, code: null })).toBe(false);
  });

  it('recognises an active search', () => {
    expect(hasActiveFilter({ code: { like: 'stock' } })).toBe(true);
  });
});

describe('the read carries paging and the requested language', () => {
  it('sends the register’s own base page size and the caller’s locale', () => {
    const variables = reportVariables('store-a', 'fr', {
      ...state,
      offset: 40,
    });
    expect(variables.page).toEqual({ first: 20, offset: 40 });
    expect(variables.userLanguage).toBe('fr');
  });
});
