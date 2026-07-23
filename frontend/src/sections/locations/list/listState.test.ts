import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_STATE,
  buildListVariables,
} from './listState';

// AC-citing tests for the list's state → variables wiring (spec/locations/
// acceptance.md § list & lifecycle). The rendered halves — the URL round-trip
// (useUrlQueryState), the server actually scoping/sorting/paginating — are
// shared-infrastructure and real-backend behaviour respectively (BUILD_REPORT
// records the real-backend gap).

describe('OMS-REG-INV-01.36 — list is store-scoped', () => {
  it('every query carries the active store id', () => {
    expect(buildListVariables(DEFAULT_STATE, 'store-7').storeId).toBe(
      'store-7'
    );
  });
});

describe('OMS-REG-INV-01.17 — sort by code or name', () => {
  it('defaults to name ascending', () => {
    expect(DEFAULT_STATE.sort).toEqual([{ key: 'name', desc: false }]);
  });

  it('a user sort flows through as the GraphQL sort array', () => {
    const variables = buildListVariables(
      { ...DEFAULT_STATE, sort: [{ key: 'code', desc: true }] },
      'store-7'
    );
    expect(variables.sort).toEqual([{ key: 'code', desc: true }]);
  });

  // Other columns are not sortable: the sort key is typed to the generated
  // LocationSortFieldInput union ('name' | 'code'), so a third key is a
  // compile error — pinned here as documentation.
  it('only name and code exist as sort keys (type-level)', () => {
    const keys: NonNullable<
      ReturnType<typeof buildListVariables>['sort']
    >[number]['key'][] = ['name', 'code'];
    expect(keys).toHaveLength(2);
  });
});

describe('OMS-REG-INV-01.14 — filter by name / code / on-hold', () => {
  it('live filters flow through in GraphQL-native shape', () => {
    const variables = buildListVariables(
      {
        ...DEFAULT_STATE,
        filter: { name: { like: 'fridge' }, onHold: true },
      },
      'store-7'
    );
    expect(variables.filter).toEqual({
      name: { like: 'fridge' },
      onHold: true,
    });
  });

  it('added-but-empty chips (null keys) are stripped before the server sees them', () => {
    const variables = buildListVariables(
      {
        ...DEFAULT_STATE,
        filter: { name: null, code: { like: 'A' }, onHold: null },
      },
      'store-7'
    );
    expect(variables.filter).toEqual({ code: { like: 'A' } });
  });
});

describe('OMS-REG-INV-01.19 — pagination', () => {
  it('pagination is server-side: first/offset from the URL state', () => {
    const variables = buildListVariables(
      { ...DEFAULT_STATE, offset: 40, first: 20 },
      'store-7'
    );
    expect(variables.page).toEqual({ first: 20, offset: 40 });
  });

  it('starts on the first page at the default size', () => {
    expect(DEFAULT_STATE.offset).toBe(0);
    expect(DEFAULT_STATE.first).toBe(DEFAULT_PAGE_SIZE);
  });
});
