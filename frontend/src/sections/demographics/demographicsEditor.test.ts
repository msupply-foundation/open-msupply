import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'solid-js';
import { BASE_YEAR, GENERAL_ROW_ID, ZERO_RATES } from './draft';
import type { LoadedDemographics, SaveOutcome } from './demographicsApi';

// The editor — the screen's behaviour minus rendering — driven over a stubbed
// api and permission: the draft's dirty lifecycle, New indicator, Cancel,
// Save's outcomes, and the up-front permission mirror. Rendering (the cells,
// the footer, the dialog) is the page's, exercised live (BUILD_REPORT.md § C2)
// and by the e2e suite to come.
//
// Behaviour anchors: spec/demographics/cases/OMS-REG-MNG-03 (behaviour ids,
// cited as `.n`; the former AC-* ids map to them in acceptance.md).

const state = {
  permissions: new Set<string>(['EDIT_CENTRAL_DATA']),
  loaded: undefined as LoadedDemographics | undefined,
  saveOutcome: { kind: 'saved' } as SaveOutcome,
};
const loads =
  vi.fn<(storeId: string) => Promise<LoadedDemographics | undefined>>();
const saves = vi.fn<(inputs: unknown) => Promise<SaveOutcome>>();
const denied = vi.fn<(permissions: string[]) => void>();
let nextId = 0;

vi.mock('@/store/storeContext', () => ({
  hasPermission: (permission: string) => state.permissions.has(permission),
  // The shared central-data guard (storeContext), mirrored: true when the
  // permission is held, else the permission-denied modal and false.
  guardCentralDataEdit: () => {
    if (state.permissions.has('EDIT_CENTRAL_DATA')) return true;
    denied(['EditCentralData']);
    return false;
  },
}));
vi.mock('@/api/graphql', () => ({
  reportPermissionDenied: (permissions: string[]) => denied(permissions),
}));
vi.mock('@/uuid', () => ({
  generateUUID: () => `new-${++nextId}`,
}));
vi.mock('./demographicsApi', () => ({
  loadDemographics: (storeId: string) => loads(storeId),
  saveDemographics: (inputs: unknown) => saves(inputs),
}));

const { createDemographicsEditor } = await import('./demographicsEditor');

const general = {
  id: GENERAL_ROW_ID,
  name: 'General Population',
  baseYear: BASE_YEAR,
  basePopulation: 1000,
  populationPercentage: 100,
  year1Projection: 0,
  year2Projection: 0,
  year3Projection: 0,
  year4Projection: 0,
  year5Projection: 0,
};
const adults = {
  ...general,
  id: 'a',
  name: 'Adults',
  populationPercentage: 60,
};
const projection = {
  __typename: 'DemographicProjectionNode' as const,
  id: 'proj-2024',
  baseYear: BASE_YEAR,
  year1: 10,
  year2: 10,
  year3: 10,
  year4: 10,
  year5: 10,
};

// Let the resource's continuations run (microtasks behind the resolved load).
const settle = () => new Promise<void>(r => setTimeout(r));

const open = async () => {
  let dispose = () => {};
  const editor = createRoot(d => {
    dispose = d;
    return createDemographicsEditor({
      storeId: () => 'store-1',
      generalPopulationName: () => 'General population',
    });
  });
  await settle();
  return { editor, dispose };
};

beforeEach(() => {
  state.permissions = new Set(['EDIT_CENTRAL_DATA']);
  state.loaded = { indicators: [adults, general], projection };
  state.saveOutcome = { kind: 'saved' };
  loads.mockReset().mockImplementation(() => Promise.resolve(state.loaded));
  saves
    .mockReset()
    .mockImplementation(() => Promise.resolve(state.saveOutcome));
  denied.mockClear();
  nextId = 0;
});

describe('loading (rules § the grid)', () => {
  it('OMS-REG-MNG-03.39 — a freshly loaded grid is not dirty', async () => {
    const { editor, dispose } = await open();
    expect(editor.loading()).toBe(false);
    expect(editor.dirty()).toBe(false);
    expect(editor.draft.indicators.map(row => row.id)).toEqual([
      GENERAL_ROW_ID,
      'a',
    ]);
    expect(editor.baseline()).toBe(1000);
    expect(editor.draft.rates.year1).toBe(10);
    dispose();
  });

  it('a failed load leaves nothing to edit', async () => {
    state.loaded = undefined;
    const { editor, dispose } = await open();
    expect(editor.loadFailed()).toBe(true);
    expect(editor.draft.indicators).toEqual([]);
    dispose();
  });

  // The page withdraws New indicator and Save while this is true, so a draft
  // built on nothing can never be sent: with no general population row the
  // baseline would save as 0, and the rate write would INSERT a second record
  // for the base year, which the server refuses.
  it('a reload that fails withdraws the writes and leaves Cancel a way out', async () => {
    const { editor, dispose } = await open();
    expect(editor.loadFailed()).toBe(false);

    state.loaded = undefined;
    editor.setBaseline(5);
    await editor.save();
    await settle();

    expect(editor.loadFailed()).toBe(true);
    // Cancel has no answer to return to, so it empties the draft rather than
    // doing nothing — the leave guard has to be clearable.
    editor.cancel();
    expect(editor.dirty()).toBe(false);
    expect(editor.draft.indicators).toEqual([]);
    expect(editor.draft.rates).toEqual(ZERO_RATES);
    expect(editor.rejection()).toBeUndefined();
    dispose();
  });
});

describe('editing the draft (rules § editing the draft, § the calculation)', () => {
  it('OMS-REG-MNG-03.6 — the baseline is the general population row’s current population, live', async () => {
    const { editor, dispose } = await open();
    editor.setBaseline(2000);
    expect(editor.baseline()).toBe(2000);
    expect(editor.dirty()).toBe(true);
    dispose();
  });

  it('OMS-REG-MNG-03.22 — a share edit lands on that row alone', async () => {
    const { editor, dispose } = await open();
    editor.setShare('a', 33.33);
    expect(editor.draft.indicators[1]?.populationPercentage).toBe(33.33);
    expect(editor.draft.indicators[0]?.populationPercentage).toBe(100);
    dispose();
  });

  it('OMS-REG-MNG-03.23 — a cleared rate (or share, or baseline) reads as zero', async () => {
    const { editor, dispose } = await open();
    editor.setRate(2, undefined);
    editor.setShare('a', undefined);
    editor.setBaseline(undefined);
    expect(editor.draft.rates).toEqual({
      year1: 10,
      year2: 0,
      year3: 10,
      year4: 10,
      year5: 10,
    });
    expect(editor.draft.indicators[1]?.populationPercentage).toBe(0);
    expect(editor.baseline()).toBe(0);
    dispose();
  });

  it('OMS-REG-MNG-03.11 — New indicator appends a blank unsaved row at the end and dirties the draft', async () => {
    const { editor, dispose } = await open();
    editor.addIndicator();
    const rows = editor.draft.indicators;
    expect(rows).toHaveLength(3);
    expect(rows[2]).toMatchObject({
      id: 'new-1',
      name: '',
      populationPercentage: 0,
      // Born with the base year of the first indicator in the read's order.
      baseYear: BASE_YEAR,
      isNew: true,
    });
    expect(editor.dirty()).toBe(true);
    dispose();
  });

  it('OMS-REG-MNG-03.43 — Cancel returns every value to its loaded state and drops the new rows', async () => {
    const { editor, dispose } = await open();
    editor.setBaseline(5);
    editor.setRate(1, 99);
    editor.setName('a', 'Renamed');
    editor.addIndicator();
    editor.cancel();
    expect(editor.dirty()).toBe(false);
    expect(editor.baseline()).toBe(1000);
    expect(editor.draft.rates.year1).toBe(10);
    expect(editor.draft.indicators.map(row => row.name)).toEqual([
      'General Population',
      'Adults',
    ]);
    dispose();
  });
});

describe('the permission mirror (rules § access)', () => {
  it('OMS-REG-MNG-03.13 — New indicator is refused up front without the central-data permission', async () => {
    state.permissions = new Set(['SERVER_ADMIN']);
    const { editor, dispose } = await open();
    editor.addIndicator();
    expect(denied).toHaveBeenCalledWith(['EditCentralData']);
    expect(editor.draft.indicators).toHaveLength(2);
    expect(editor.dirty()).toBe(false);
    dispose();
  });

  it('OMS-REG-MNG-03.14 — Save is refused up front and nothing is sent', async () => {
    state.permissions = new Set();
    const { editor, dispose } = await open();
    editor.setBaseline(5); // the grid stays editable; only the writes refuse
    expect(editor.dirty()).toBe(true);
    await editor.save();
    expect(denied).toHaveBeenCalledWith(['EditCentralData']);
    expect(saves).not.toHaveBeenCalled();
    expect(editor.dirty()).toBe(true);
    dispose();
  });
});

describe('saving (rules § saving the draft)', () => {
  it('OMS-REG-MNG-03.40 — Save sends the whole draft under the screen’s general-population label, then reloads', async () => {
    const { editor, dispose } = await open();
    editor.setBaseline(2000);
    editor.setRate(1, 5);
    editor.addIndicator();
    editor.setName('new-1', 'Children');
    editor.setShare('new-1', 30);
    const saving = editor.save();
    expect(editor.saving()).toBe(true);
    await saving;
    expect(saves).toHaveBeenCalledTimes(1);
    expect(saves.mock.calls[0]?.[0]).toEqual({
      updates: [
        expect.objectContaining({
          id: GENERAL_ROW_ID,
          name: 'General population',
          basePopulation: 2000,
          year1Projection: 2100,
        }),
        expect.objectContaining({
          id: 'a',
          name: 'Adults',
          basePopulation: 2000,
        }),
      ],
      inserts: [
        expect.objectContaining({
          id: 'new-1',
          name: 'Children',
          populationPercentage: 30,
          basePopulation: 2000,
          year1Projection: 630,
        }),
      ],
      projection: {
        kind: 'update',
        input: {
          id: 'proj-2024',
          baseYear: BASE_YEAR,
          year1: 5,
          year2: 10,
          year3: 10,
          year4: 10,
          year5: 10,
        },
      },
    });
    // Success is the reload: a second read, and the draft clean again.
    expect(loads).toHaveBeenCalledTimes(2);
    expect(editor.saving()).toBe(false);
    expect(editor.dirty()).toBe(false);
    expect(editor.rejection()).toBeUndefined();
    dispose();
  });

  it('OMS-REG-MNG-03.43 — with no rates stored, editing a rate and cancelling reads zero again', async () => {
    state.loaded = { indicators: [general], projection: undefined };
    const { editor, dispose } = await open();
    editor.setRate(1, 10);
    editor.setRate(4, 10);
    expect(editor.draft.rates.year1).toBe(10);
    editor.cancel();
    // The zero-rates seed must not have been mutated through the store.
    expect(editor.draft.rates).toEqual(ZERO_RATES);
    expect(ZERO_RATES.year1).toBe(0);
    dispose();
  });

  it('OMS-REG-MNG-03.36 — with no rates stored, Save creates the record', async () => {
    state.loaded = { indicators: [general], projection: undefined };
    const { editor, dispose } = await open();
    expect(editor.draft.rates).toEqual(ZERO_RATES);
    editor.setRate(1, 2.5);
    await editor.save();
    expect(saves.mock.calls[0]?.[0]).toMatchObject({
      projection: {
        kind: 'insert',
        input: { id: 'new-1', baseYear: BASE_YEAR, year1: 2.5 },
      },
    });
    dispose();
  });

  it('OMS-REG-MNG-03.42 — a rejected save keeps the draft on screen and dirty, with the reason', async () => {
    state.saveOutcome = {
      kind: 'rejected',
      rejection: { message: 'Demographic indicator has no name' },
      acceptedNewIds: [],
    };
    const { editor, dispose } = await open();
    editor.addIndicator();
    editor.setBaseline(3000);
    await editor.save();
    expect(editor.rejection()?.message).toBe(
      'Demographic indicator has no name'
    );
    expect(editor.dirty()).toBe(true);
    expect(editor.saving()).toBe(false);
    expect(editor.baseline()).toBe(3000);
    expect(editor.draft.indicators).toHaveLength(3);
    // No reload after a failure — the draft IS what is on screen.
    expect(loads).toHaveBeenCalledTimes(1);
    // Cancel clears the notice with the draft.
    editor.cancel();
    expect(editor.rejection()).toBeUndefined();
    dispose();
  });

  it('OMS-REG-MNG-03.41 — new rows the server accepted alongside a rejected one are updated, not re-inserted, on retry', async () => {
    const { editor, dispose } = await open();
    editor.addIndicator(); // new-1 (accepted)
    editor.addIndicator(); // new-2 (rejected)
    editor.setName('new-1', 'Children');
    state.saveOutcome = {
      kind: 'rejected',
      rejection: { message: 'Demographic indicator has no name' },
      acceptedNewIds: ['new-1'],
    };
    await editor.save();
    expect(editor.draft.indicators.find(row => row.id === 'new-1')?.isNew).toBe(
      false
    );
    expect(editor.draft.indicators.find(row => row.id === 'new-2')?.isNew).toBe(
      true
    );
    // The retry sends new-1 as an UPDATE.
    state.saveOutcome = { kind: 'saved' };
    editor.setName('new-2', 'Pregnant women');
    await editor.save();
    const retry = saves.mock.calls[1]?.[0] as {
      updates: { id: string }[];
      inserts: { id: string }[];
    };
    expect(retry.updates.map(u => u.id)).toEqual([
      GENERAL_ROW_ID,
      'a',
      'new-1',
    ]);
    expect(retry.inserts.map(i => i.id)).toEqual(['new-2']);
    dispose();
  });

  it('a refused or failed save releases the busy state and keeps the draft', async () => {
    state.saveOutcome = { kind: 'failed', acceptedNewIds: [] };
    const { editor, dispose } = await open();
    editor.setBaseline(7);
    await editor.save();
    expect(editor.saving()).toBe(false);
    expect(editor.dirty()).toBe(true);
    expect(editor.rejection()).toBeUndefined();
    expect(loads).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('a pristine draft has nothing to save', async () => {
    const { editor, dispose } = await open();
    await editor.save();
    expect(saves).not.toHaveBeenCalled();
    dispose();
  });
});
