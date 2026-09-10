import { describe, expect, it } from 'vitest';
import {
  BREACH_SORT_KEYS,
  CHART_POINT_CAP,
  DEFAULT_STATE,
  DEFAULT_WINDOW_MS,
  LOG_SORT_KEYS,
  OFFERED_BREACH_TYPES,
  buildBreachesVariables,
  buildChartVariables,
  buildLogsVariables,
  chartWindow,
  needsArrivalWindow,
  tabFromParam,
  widenToInclude,
  withDefaultWindow,
  type MonitoringFilter,
  type MonitoringState,
} from './monitoringState';

// Logic-level coverage of the monitoring screen's query shapes
// (spec/cold-chain-monitoring). Behaviour that has a backend is validated at
// the query-shape level here; the live-backend leg (C2) and the rendered-UI
// leg (C4) are recorded in BUILD_REPORT.
// Anchors: spec/cold-chain-monitoring/cases/OMS-REG-CCE-02.

const NOW = new Date('2026-09-08T10:00:00.000Z');
const STORE = 'store-a';

const state = (over: Partial<MonitoringState> = {}): MonitoringState => ({
  ...DEFAULT_STATE,
  ...over,
});
const withFilter = (filter: MonitoringFilter): MonitoringState =>
  state({ filter });

describe('store scoping — every read belongs to the active store', () => {
  it('sends the store on all three reads and offers no store key to widen it', () => {
    const breaches = buildBreachesVariables(state(), STORE);
    const logs = buildLogsVariables(state(), STORE);
    const chart = buildChartVariables(DEFAULT_STATE.filter, STORE, NOW);
    for (const vars of [breaches, logs, chart]) {
      expect(vars.storeId).toBe(STORE);
      expect(Object.keys(vars.filter ?? {})).not.toContain('storeId');
    }
  });
});

describe('the shared filter set arrives with its three default chips', () => {
  it('seeds both start bounds and the Unacknowledged switch present but empty', () => {
    expect(DEFAULT_STATE.filter).toEqual({
      fromStart: null,
      toStart: null,
      unacknowledged: null,
    });
  });

  it('queries no filter at all while every chip is empty', () => {
    expect(buildBreachesVariables(state(), STORE).filter).toEqual({});
    expect(buildLogsVariables(state(), STORE).filter).toEqual({});
  });

  it('does not offer Excursion as a breach type — it is never a stored breach', () => {
    expect(OFFERED_BREACH_TYPES).toHaveLength(4);
    expect(OFFERED_BREACH_TYPES).not.toContain('EXCURSION');
  });

  it('names the three tabs and falls back to the chart for an unknown one', () => {
    expect(tabFromParam('breaches')).toBe('breaches');
    expect(tabFromParam('log')).toBe('log');
    expect(tabFromParam(undefined)).toBe('chart');
    expect(tabFromParam('Breaches')).toBe('chart');
  });
});

describe('OMS-REG-CCE-02.11 / .1 — the default 24-hour window and its address', () => {
  it('adopts the default window only on a pristine arrival', () => {
    expect(needsArrivalWindow(undefined)).toBe(true);
    expect(needsArrivalWindow('')).toBe(true);
    // An address that names a filter — bounds present or deliberately cleared —
    // is honoured as written.
    expect(needsArrivalWindow('{"filter":{"sensorName":"Fridge"}}')).toBe(
      false
    );
  });

  it('writes the last 24 hours, ending now, into the two bound chips', () => {
    const seeded = withDefaultWindow(DEFAULT_STATE.filter, NOW);
    expect(seeded.toStart).toBe(NOW.toISOString());
    expect(seeded.fromStart).toBe(
      new Date(NOW.getTime() - DEFAULT_WINDOW_MS).toISOString()
    );
    // The switch chip rides along untouched.
    expect(seeded.unacknowledged).toBeNull();
  });

  it('plots both bounds as given, however narrow or wide', () => {
    const window = chartWindow(
      {
        fromStart: '2026-09-01T00:00:00.000Z',
        toStart: '2026-09-08T00:00:00.000Z',
      },
      NOW
    );
    expect(window).toEqual({
      start: Date.parse('2026-09-01T00:00:00.000Z'),
      end: Date.parse('2026-09-08T00:00:00.000Z'),
    });
  });

  it('takes the start as 24 hours before an end given alone', () => {
    const end = '2026-09-07T12:00:00.000Z';
    expect(chartWindow({ toStart: end }, NOW)).toEqual({
      start: Date.parse(end) - DEFAULT_WINDOW_MS,
      end: Date.parse(end),
    });
  });

  it('runs a start given alone up to now, and has no window with no bounds', () => {
    const start = '2026-09-07T12:00:00.000Z';
    expect(chartWindow({ fromStart: start }, NOW)).toEqual({
      start: Date.parse(start),
      end: NOW.getTime(),
    });
    expect(chartWindow({}, NOW)).toBeUndefined();
    expect(
      chartWindow({ fromStart: null, toStart: null }, NOW)
    ).toBeUndefined();
  });

  it('sends the derived start on the wire for an end-only range', () => {
    const end = '2026-09-07T12:00:00.000Z';
    const vars = buildChartVariables({ toStart: end }, STORE, NOW);
    expect(vars.filter?.datetime).toEqual({
      afterOrEqualTo: new Date(
        Date.parse(end) - DEFAULT_WINDOW_MS
      ).toISOString(),
      beforeOrEqualTo: end,
    });
  });

  it('leaves a start-only range open-ended on the wire', () => {
    const start = '2026-09-07T12:00:00.000Z';
    const vars = buildChartVariables({ fromStart: start }, STORE, NOW);
    expect(vars.filter?.datetime).toEqual({ afterOrEqualTo: start });
  });
});

describe('OMS-REG-CCE-02.1 — the chart reads every sensor’s readings, bounded', () => {
  it('requests readings ascending by time, at the data-point cap, from offset 0', () => {
    const vars = buildChartVariables(DEFAULT_STATE.filter, STORE, NOW);
    expect(vars.sort).toEqual([{ key: 'datetime', desc: false }]);
    expect(vars.page).toEqual({ first: CHART_POINT_CAP, offset: 0 });
    expect(CHART_POINT_CAP).toBe(8640);
  });
});

describe('OMS-REG-CCE-02.8 / .9 / .10 — the chart narrows on the shared filters', () => {
  it('filters by sensor name as a substring match', () => {
    const vars = buildChartVariables({ sensorName: 'Fridge' }, STORE, NOW);
    expect(vars.filter?.sensor).toEqual({ name: { like: 'Fridge' } });
  });

  it('filters by the location CODE, never its name', () => {
    const vars = buildChartVariables({ locationCode: '1231' }, STORE, NOW);
    expect(vars.filter?.location).toEqual({ code: { like: '1231' } });
    expect(vars.filter?.location).not.toHaveProperty('name');
  });

  it('filters by breach type through the reading’s breach', () => {
    const vars = buildChartVariables(
      { breachType: 'HOT_CUMULATIVE' },
      STORE,
      NOW
    );
    expect(vars.filter?.temperatureBreach).toEqual({
      type: { equalTo: 'HOT_CUMULATIVE' },
    });
  });
});

describe('OMS-REG-CCE-02.12 — both acknowledged and unacknowledged breaches are listed', () => {
  it('sends no unacknowledged filter while the switch is unticked', () => {
    expect(buildBreachesVariables(state(), STORE).filter).not.toHaveProperty(
      'unacknowledged'
    );
    expect(
      buildBreachesVariables(
        withFilter({ ...DEFAULT_STATE.filter, unacknowledged: null }),
        STORE
      ).filter
    ).not.toHaveProperty('unacknowledged');
  });
});

describe('OMS-REG-CCE-02.21 — the Unacknowledged filter switches which breaches are listed', () => {
  it('sends unacknowledged: true while ticked', () => {
    const vars = buildBreachesVariables(
      withFilter({ unacknowledged: true }),
      STORE
    );
    expect(vars.filter?.unacknowledged).toBe(true);
  });

  it('never sends unacknowledged: false — an acknowledged-only list is not offered', () => {
    const vars = buildBreachesVariables(
      withFilter({ unacknowledged: false }),
      STORE
    );
    expect(vars.filter).not.toHaveProperty('unacknowledged');
  });

  it('does not carry the switch to the log read — it is a breach fact', () => {
    const vars = buildLogsVariables(
      withFilter({ unacknowledged: true }),
      STORE
    );
    expect(JSON.stringify(vars.filter)).not.toContain('unacknowledged');
  });
});

describe('OMS-REG-CCE-02.13 / .14 — breaches sort on start and end only', () => {
  it('defaults to breach start, newest first', () => {
    expect(DEFAULT_STATE.breachSort).toEqual([
      { key: 'startDatetime', desc: true },
    ]);
  });

  it('offers exactly the two keys the schema has', () => {
    expect([...BREACH_SORT_KEYS].sort()).toEqual([
      'endDatetime',
      'startDatetime',
    ]);
  });

  it('sends whichever is chosen, as a single-element list — the server reads one entry', () => {
    for (const key of BREACH_SORT_KEYS) {
      const vars = buildBreachesVariables(
        state({ breachSort: [{ key, desc: false }] }),
        STORE
      );
      expect(vars.sort).toEqual([{ key, desc: false }]);
      expect(vars.sort).toHaveLength(1);
    }
  });
});

describe('OMS-REG-CCE-02.7 — the marker’s way through lists the selected breach', () => {
  // Anchors: OMS-REG-CCE-02.7 (rules › the chart: the way through carries the
  // screen's filters, widened only as far as needed for that breach to be
  // listed). The Breaches read binds the range to a breach's START, so a
  // breach that began before the window — marked on the chart at its first
  // in-window reading — would otherwise fall off the list it hands to.
  const window = {
    fromStart: '2026-09-07T02:40:00.000Z',
    toStart: '2026-09-08T02:40:00.000Z',
    unacknowledged: null,
  };

  it('moves the start bound back to a breach that began before the window, and only that bound', () => {
    const widened = widenToInclude(window, {
      startDatetime: '2026-09-06T21:45:37+00:00',
      unacknowledged: true,
    });
    expect(widened).toEqual({
      ...window,
      fromStart: '2026-09-06T21:45:37.000Z',
    });
    // …so the Breaches read now admits it (the bound is inclusive).
    const vars = buildBreachesVariables(withFilter(widened), STORE);
    expect(vars.filter?.startDatetime).toEqual({
      afterOrEqualTo: '2026-09-06T21:45:37.000Z',
      beforeOrEqualTo: window.toStart,
    });
  });

  it('leaves a breach that began inside the window exactly as filtered', () => {
    const inside = {
      startDatetime: '2026-09-07T10:00:00Z',
      unacknowledged: true,
    };
    expect(widenToInclude(window, inside)).toEqual(window);
    const noBounds = { sensorName: 'Fridge', unacknowledged: null };
    expect(widenToInclude(noBounds, inside)).toEqual(noBounds);
  });

  it('releases the unacknowledged-only switch for an acknowledged breach, and keeps it for an unacknowledged one', () => {
    const ticked = { ...window, unacknowledged: true };
    expect(
      widenToInclude(ticked, {
        startDatetime: '2026-09-07T10:00:00Z',
        unacknowledged: false,
      }).unacknowledged
    ).toBeNull();
    expect(
      widenToInclude(ticked, {
        startDatetime: '2026-09-07T10:00:00Z',
        unacknowledged: true,
      }).unacknowledged
    ).toBe(true);
  });

  it('keeps a start bound already at or before the breach’s start (the bound is inclusive)', () => {
    const atStart = {
      ...window,
      fromStart: '2026-09-06T21:45:37.000Z',
    };
    expect(
      widenToInclude(atStart, {
        startDatetime: '2026-09-06T21:45:37+00:00',
        unacknowledged: true,
      })
    ).toEqual(atStart);
  });

  it('touches no other chip, and ignores a start it cannot parse', () => {
    const chips = {
      ...window,
      sensorName: 'Seeded',
      locationCode: '1231',
      breachType: 'HOT_CUMULATIVE' as const,
    };
    const widened = widenToInclude(chips, {
      startDatetime: '2026-09-01T00:00:00Z',
      unacknowledged: true,
    });
    expect(widened).toEqual({
      ...chips,
      fromStart: '2026-09-01T00:00:00.000Z',
    });
    expect(
      widenToInclude(chips, {
        startDatetime: 'not-a-date',
        unacknowledged: true,
      })
    ).toEqual(chips);
  });
});

describe('the date range binds to a breach’s START, never its end', () => {
  it('maps both bound chips onto startDatetime for breaches', () => {
    const vars = buildBreachesVariables(
      withFilter({
        fromStart: '2026-09-07T00:00:00.000Z',
        toStart: '2026-09-08T00:00:00.000Z',
      }),
      STORE
    );
    expect(vars.filter?.startDatetime).toEqual({
      afterOrEqualTo: '2026-09-07T00:00:00.000Z',
      beforeOrEqualTo: '2026-09-08T00:00:00.000Z',
    });
    // An endDatetime bound would silently drop every ongoing breach.
    expect(vars.filter).not.toHaveProperty('endDatetime');
  });

  it('sends a one-sided range as one bound, and two empty chips as no range', () => {
    const oneSided = buildBreachesVariables(
      withFilter({ fromStart: '2026-09-07T00:00:00.000Z', toStart: null }),
      STORE
    );
    expect(oneSided.filter?.startDatetime).toEqual({
      afterOrEqualTo: '2026-09-07T00:00:00.000Z',
    });
    const empty = buildBreachesVariables(
      withFilter({ fromStart: null, toStart: null }),
      STORE
    );
    expect(empty.filter).not.toHaveProperty('startDatetime');
  });
});

describe('OMS-REG-CCE-02.26 / .27 / .28 — the log lists readings, sorting on time and temperature', () => {
  it('defaults to date time, oldest first', () => {
    expect(DEFAULT_STATE.logSort).toEqual([{ key: 'datetime', desc: false }]);
  });

  it('offers exactly the two keys the schema has', () => {
    expect([...LOG_SORT_KEYS].sort()).toEqual(['datetime', 'temperature']);
  });

  it('sends whichever is chosen, as a single-element list', () => {
    for (const key of LOG_SORT_KEYS) {
      const vars = buildLogsVariables(
        state({ logSort: [{ key, desc: true }] }),
        STORE
      );
      expect(vars.sort).toEqual([{ key, desc: true }]);
    }
  });
});

describe('OMS-REG-CCE-02.29 / .30 / .31 / .32 — the log narrows on the shared filters', () => {
  it('filters by sensor name', () => {
    const vars = buildLogsVariables(
      withFilter({ sensorName: 'Fridge' }),
      STORE
    );
    expect(vars.filter?.sensor).toEqual({ name: { like: 'Fridge' } });
  });

  it('filters by location code', () => {
    const vars = buildLogsVariables(
      withFilter({ locationCode: '1231' }),
      STORE
    );
    expect(vars.filter?.location).toEqual({ code: { like: '1231' } });
  });

  it('filters by breach type through the reading’s breach', () => {
    const vars = buildLogsVariables(
      withFilter({ breachType: 'COLD_CONSECUTIVE' }),
      STORE
    );
    expect(vars.filter?.temperatureBreach).toEqual({
      type: { equalTo: 'COLD_CONSECUTIVE' },
    });
  });

  it('maps the same two bound chips onto the reading’s timestamp', () => {
    const vars = buildLogsVariables(
      withFilter({
        fromStart: '2026-09-07T00:00:00.000Z',
        toStart: '2026-09-08T00:00:00.000Z',
      }),
      STORE
    );
    expect(vars.filter?.datetime).toEqual({
      afterOrEqualTo: '2026-09-07T00:00:00.000Z',
      beforeOrEqualTo: '2026-09-08T00:00:00.000Z',
    });
  });
});

describe('OMS-REG-CCE-02.23 / .33 — rows per page drive each table’s page', () => {
  it('sends first + offset, per tab, sharing one page size', () => {
    const s = state({ first: 20, breachOffset: 40, logOffset: 60 });
    expect(buildBreachesVariables(s, STORE).page).toEqual({
      first: 20,
      offset: 40,
    });
    expect(buildLogsVariables(s, STORE).page).toEqual({
      first: 20,
      offset: 60,
    });
  });

  it('never requests a page below one row', () => {
    expect(DEFAULT_STATE.first).toBeGreaterThanOrEqual(1);
  });
});
