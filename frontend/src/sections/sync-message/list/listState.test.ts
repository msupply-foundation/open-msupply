import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_STATE,
  SORT_KEYS,
  buildListVariables,
  pageFromResult,
  type SyncMessagesListState,
} from './listState';
import type { SyncMessagesResult } from './syncMessages.generated';

// Anchors: spec/sync-message/cases/OMS-REG-MNG-05.
//   .2  — the register lists messages for EVERY store the server holds
//   .3  — the register's columns, default-sorted newest-created first
//   .5  — sortable by Created date and Status; From/To store and Type are not
//   .6  — Status is the only filter offered, and narrowing works
//   .7  — the register pages server-side, its page and sort URL-backed
//   .28 — a Status sort groups statuses, and is never presented as lifecycle
//         progress
//   .29 — a failed register read states that the list did not refresh
// (rules.md § listing, ordering and filtering; contract.md § listing.)

const state = (over: Partial<SyncMessagesListState> = {}) => ({
  ...DEFAULT_STATE,
  ...over,
});

const page = (
  nodes: SyncMessagesResult['centralServer']['syncMessage']['syncMessages']['nodes'] = [],
  totalCount = 0
): SyncMessagesResult => ({
  centralServer: { syncMessage: { syncMessages: { nodes, totalCount } } },
});

describe('OMS-REG-MNG-05.2 — the register is server-wide', () => {
  it('carries the store only as the read’s authorisation argument', () => {
    const variables = buildListVariables(DEFAULT_STATE, 'store-a');
    expect(variables.storeId).toBe('store-a');
  });

  it('adds no sender or destination predicate, so every store’s messages list', () => {
    const variables = buildListVariables(DEFAULT_STATE, 'store-a');
    expect(variables.filter?.fromStoreId).toBeUndefined();
    expect(variables.filter?.toStoreId).toBeUndefined();
  });
});

describe('OMS-REG-MNG-05.3 — default ordering is newest created first', () => {
  it('sorts by created datetime, descending', () => {
    expect(DEFAULT_STATE.sort).toEqual([
      { key: 'createdDatetime', desc: true },
    ]);
  });

  it('sends that sort on the wire', () => {
    expect(buildListVariables(DEFAULT_STATE, 's').sort).toEqual([
      { key: 'createdDatetime', desc: true },
    ]);
  });
});

describe('OMS-REG-MNG-05.5 — which columns sort', () => {
  it('offers exactly Created date and Status', () => {
    expect(Object.values(SORT_KEYS)).toEqual(['createdDatetime', 'status']);
  });

  it('offers no key for From store, To store or Type', () => {
    const offered: string[] = Object.values(SORT_KEYS);
    expect(offered).not.toContain('fromStore');
    expect(offered).not.toContain('toStore');
    expect(offered).not.toContain('type');
  });

  it('carries a header click straight to the wire, in either direction', () => {
    const ascending = buildListVariables(
      state({ sort: [{ key: SORT_KEYS.status, desc: false }] }),
      's'
    );
    expect(ascending.sort).toEqual([{ key: 'status', desc: false }]);
    const descending = buildListVariables(
      state({ sort: [{ key: SORT_KEYS.status, desc: true }] }),
      's'
    );
    expect(descending.sort).toEqual([{ key: 'status', desc: true }]);
  });
});

describe('OMS-REG-MNG-05.28 — the Status sort is a grouping, never progress', () => {
  it('sends ONE sort key: the resolver takes the last element and ignores the rest, so a multi-key sort would silently reduce', () => {
    const variables = buildListVariables(
      state({ sort: [{ key: SORT_KEYS.status, desc: false }] }),
      's'
    );
    expect(variables.sort).toHaveLength(1);
  });

  it('has no lifecycle ordering of its own to present — the sort is the server’s enum order', () => {
    // The register offers the key and nothing else: no client-side lifecycle
    // sequence exists here to be mistaken for one (contract ⚠️ wire trap —
    // the status sort orders by neither the lifecycle nor the alphabet, and
    // differs by database backend).
    expect(SORT_KEYS.status).toBe('status');
  });
});

describe('OMS-REG-MNG-05.6 — Status is the only filter, and it narrows', () => {
  it('seeds the Status chip present-but-empty, constraining nothing', () => {
    expect(DEFAULT_STATE.filter).toEqual({ status: null });
    expect(buildListVariables(DEFAULT_STATE, 's').filter).toEqual({});
  });

  it('sends the picked status as an equality filter', () => {
    const variables = buildListVariables(
      state({ filter: { status: { equalTo: 'processed' } } }),
      's'
    );
    expect(variables.filter).toEqual({ status: { equalTo: 'processed' } });
  });

  it('drops the chip again when the choice is cleared', () => {
    const variables = buildListVariables(
      state({ filter: { status: null } }),
      's'
    );
    expect(variables.filter).toEqual({});
  });

  it('carries NO kind and NO created-date filter in its state, so neither can reach the wire (D120)', () => {
    // The kind filter the current app offers is not merely inert: the server
    // has no `type` filter field, so a filter object carrying one fails the
    // WHOLE query at validation. createdDatetime is declared but never mapped,
    // so a range would narrow nothing and report no error. Both are withheld
    // until the server backs them (contract § backend gaps).
    const wire = buildListVariables(DEFAULT_STATE, 's').filter ?? {};
    expect(wire).not.toHaveProperty('type');
    expect(wire).not.toHaveProperty('createdDatetime');
    expect(Object.keys(DEFAULT_STATE.filter)).toEqual(['status']);
  });
});

describe('OMS-REG-MNG-05.7 — server-side pagination', () => {
  it('defaults to the first page of 20', () => {
    expect(DEFAULT_STATE.offset).toBe(0);
    expect(DEFAULT_STATE.first).toBe(DEFAULT_PAGE_SIZE);
    expect(buildListVariables(DEFAULT_STATE, 's').page).toEqual({
      first: 20,
      offset: 0,
    });
  });

  it('always sends a page size — omitting it returns every row the server holds', () => {
    const variables = buildListVariables(state({ offset: 40 }), 's');
    expect(variables.page?.first).toBe(DEFAULT_PAGE_SIZE);
    expect(variables.page?.offset).toBe(40);
  });
});

describe('OMS-REG-MNG-05.29 — a failed read does not read as a result', () => {
  it('yields the page a successful read returned', () => {
    const result = pageFromResult({ kind: 'success', data: page([], 7) });
    expect(result).toEqual({ nodes: [], totalCount: 7 });
  });

  it('yields NO page on a failure, so the screen can say the list did not refresh', () => {
    expect(pageFromResult({ kind: 'unexpectedError' })).toBeUndefined();
    expect(pageFromResult({ kind: 'forbidden' })).toBeUndefined();
    expect(
      pageFromResult({
        kind: 'graphqlError',
        message: 'Bad user input',
        errors: [],
      })
    ).toBeUndefined();
  });
});
