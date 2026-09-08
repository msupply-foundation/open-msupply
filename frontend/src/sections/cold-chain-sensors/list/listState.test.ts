import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STATE,
  SORTABLE_KEYS,
  buildListVariables,
  type SensorsListState,
} from './listState';

// Logic-level coverage of the sensor list's query shape (spec/cold-chain-
// sensors). Behaviour that has a backend is validated at the query-shape level
// here; the live-backend leg (C2) and the rendered-UI/a11y leg (C4) are
// recorded as gaps in BUILD_REPORT. Tests cite the AC they exercise.

const state = (over: Partial<SensorsListState> = {}): SensorsListState => ({
  ...DEFAULT_STATE,
  ...over,
});

describe('AC-S1 the list shows only the active store’s sensors', () => {
  it('scopes the query to the store in the path', () => {
    expect(buildListVariables(state(), 'storeA').storeId).toBe('storeA');
  });

  it('offers no filter key that could widen the store scope', () => {
    const vars = buildListVariables(
      state({ filter: { serial: { like: 'BRL' } } }),
      'storeA'
    );
    expect(Object.keys(vars.filter ?? {})).not.toContain('storeId');
  });
});

describe('AC-L1 default order is serial number descending', () => {
  it('defaults sort to serial descending', () => {
    expect(DEFAULT_STATE.sort).toEqual([{ key: 'serial', desc: true }]);
    expect(buildListVariables(state(), 'storeA').sort).toEqual([
      { key: 'serial', desc: true },
    ]);
  });

  it('sends a single-element sort list — the server reads only one entry', () => {
    const vars = buildListVariables(
      state({ sort: [{ key: 'name', desc: false }] }),
      'storeA'
    );
    expect(vars.sort).toHaveLength(1);
  });
});

describe('AC-L2 only Name and Serial number are sortable', () => {
  it('offers exactly those two sort keys', () => {
    expect([...SORTABLE_KEYS].sort()).toEqual(['name', 'serial']);
  });

  it('sends whichever of them the user picks', () => {
    for (const key of SORTABLE_KEYS) {
      const vars = buildListVariables(
        state({ sort: [{ key, desc: false }] }),
        'storeA'
      );
      expect(vars.sort).toEqual([{ key, desc: false }]);
    }
  });
});

describe('AC-L7 the list shows only active sensors', () => {
  it('sends the active-only restriction by default', () => {
    expect(DEFAULT_STATE.activeOnly).toBe(true);
    expect(buildListVariables(state(), 'storeA').filter?.isActive).toBe(true);
  });

  it('keeps it regardless of sort, paging or other filters', () => {
    const vars = buildListVariables(
      state({
        filter: { type: { equalTo: 'BERLINGER' } },
        sort: [{ key: 'name', desc: true }],
        offset: 40,
      }),
      'storeA'
    );
    expect(vars.filter?.isActive).toBe(true);
  });
});

describe('AC-L8 turning the restriction off reveals inactive sensors', () => {
  it('sends no isActive at all — not isActive:false', () => {
    const vars = buildListVariables(state({ activeOnly: false }), 'storeA');
    expect(vars.filter).not.toHaveProperty('isActive');
  });

  it('keeps the user’s own filters when it is off', () => {
    const vars = buildListVariables(
      state({ activeOnly: false, filter: { serial: { like: 'BRL' } } }),
      'storeA'
    );
    expect(vars.filter?.serial).toEqual({ like: 'BRL' });
  });
});

describe('AC-L3 a name filter is honoured by the read', () => {
  it('passes a name filter through when the state carries one', () => {
    // No control on the screen sets this (see listFilters — `name` is
    // dismissed); the read still honours it, captured as-is.
    const vars = buildListVariables(
      state({ filter: { name: { like: 'berl' } } }),
      'storeA'
    );
    expect(vars.filter?.name).toEqual({ like: 'berl' });
  });
});

describe('AC-L4 / AC-L5 / AC-L6 the filters the screen offers', () => {
  it('sends the sensor type as an exact match', () => {
    const vars = buildListVariables(
      state({ filter: { type: { equalTo: 'LOG_TAG' } } }),
      'storeA'
    );
    expect(vars.filter?.type).toEqual({ equalTo: 'LOG_TAG' });
  });

  it('sends the location filter against the location code', () => {
    const vars = buildListVariables(
      state({ filter: { locationCode: { like: 'RS-FR' } } }),
      'storeA'
    );
    expect(vars.filter?.locationCode).toEqual({ like: 'RS-FR' });
  });

  it('sends the serial filter as a contains match, never an exact one', () => {
    // AC-L11: the filter runs against the STORED serial, which still carries
    // the manufacturer the screen strips — an exact match on the displayed
    // serial finds nothing, so the screen only ever sends `like`.
    const vars = buildListVariables(
      state({ filter: { serial: { like: 'EE:01' } } }),
      'storeA'
    );
    expect(vars.filter?.serial).toEqual({ like: 'EE:01' });
    expect(vars.filter?.serial).not.toHaveProperty('equalTo');
  });
});

describe('AC-L9 an empty result is not an error', () => {
  it('drops added-but-empty filter chips so they never query as blanks', () => {
    const vars = buildListVariables(
      state({ filter: { serial: null, locationCode: { like: 'RS' } } }),
      'storeA'
    );
    expect(vars.filter).not.toHaveProperty('serial');
    expect(vars.filter?.locationCode).toEqual({ like: 'RS' });
  });
});

describe('the filter bar arrives with the two text filters on it', () => {
  it('seeds serial and location present but empty, and nothing else', () => {
    // ui-surface S1 § filters: both are shown "always"; sensor type is added
    // from the filter menu. A `null` chip is present-but-empty.
    expect(DEFAULT_STATE.filter).toEqual({ serial: null, locationCode: null });
  });

  it('queries no filter at all while both are still empty', () => {
    const vars = buildListVariables(state(), 'storeA');
    expect(vars.filter).toEqual({ isActive: true });
  });
});

describe('AC-L10 a page must request at least one row', () => {
  it('never sends a page size below one', () => {
    expect(DEFAULT_STATE.first).toBeGreaterThanOrEqual(1);
    const vars = buildListVariables(state({ first: 20, offset: 40 }), 'storeA');
    expect(vars.page).toEqual({ first: 20, offset: 40 });
  });
});
