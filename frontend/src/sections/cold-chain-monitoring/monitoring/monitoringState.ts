import { stripEmpty } from '@/typeHelpers';
import { DEFAULT_PAGE_SIZE } from '@/list/pageSize';
import type {
  TemperatureBreachRowFragment,
  TemperatureBreachesVariables,
  TemperatureLogsVariables,
} from '../monitoring.generated';

// The monitoring screen's URL-backed state and its mapping onto the three
// reads (spec/cold-chain-monitoring rules › the monitoring screen and its
// shared filters). Framework-free so the store scoping, the shared filter
// set, the default window, the sort keys and the pagination are testable in
// node vitest.
//
// The filter is a UI VOCABULARY rather than one generated filter input, the
// same shape the items Ledger tab uses (itemLedgerFilter.ts): one filter set
// drives two different wire inputs — the same date range is
// `TemperatureBreachFilterInput.startDatetime` on the Breaches tab and
// `TemperatureLogFilterInput.datetime` on the Log tab and the chart, and the
// same breach type is `type` on one and `temperatureBreach.type` on the other
// (contract › the monitoring screen). Neither generated input can hold the
// other's keys, so the URL holds the five domain facts and each read maps them.
// The mapped output is exactly the generated shape (kdd/type-safety).

export type BreachRow = TemperatureBreachRowFragment;
export type BreachType = BreachRow['type'];

/**
 * The breach types the filter offers, in the order the select lists them.
 * `EXCURSION` is deliberately absent: an excursion is computed on read and is
 * never a stored breach, so selecting it would match nothing (rules › the
 * monitoring screen; contract ⚠️ wire trap).
 */
export const OFFERED_BREACH_TYPES: readonly BreachType[] = [
  'COLD_CUMULATIVE',
  'COLD_CONSECUTIVE',
  'HOT_CUMULATIVE',
  'HOT_CONSECUTIVE',
] as const;

/**
 * The screen's ONE filter set (rules › the monitoring screen and its shared
 * filters), one member per FilterBar chip.
 *
 * `null` members are FilterBar's "added but empty" marker — the chip is on the
 * bar with nothing entered — and every one of them maps to NO wire filter.
 * The two date bounds are separate members because they are separate chips,
 * each removable on its own (ui-surface S1 § filters lists them as two
 * filters, both shown by default). Both are UTC ISO instants.
 *
 * `unacknowledged` is the boolean chip: `true` narrows to unacknowledged
 * breaches; `null` (the chip unticked) or absent lists both.
 *
 * This object is always carried as a SINGLE nested value in the URL state,
 * never spread across its top level: FilterBar expresses a chip removal as the
 * key's absence, so the filter must be replaced wholesale rather than merged,
 * and useUrlQueryState strips top-level nulls when parsing a URL (which would
 * erase an added-but-empty chip on the round trip).
 */
export type MonitoringFilter = {
  sensorName?: string | null;
  locationCode?: string | null;
  fromStart?: string | null;
  toStart?: string | null;
  breachType?: BreachType | null;
  unacknowledged?: boolean | null;
};

export type MonitoringTab = 'chart' | 'breaches' | 'log';
export const TABS: readonly MonitoringTab[] = ['chart', 'breaches', 'log'];
export const DEFAULT_TAB: MonitoringTab = 'chart';

/** The tab a `?tab=` value names; anything unknown is the first tab. */
export const tabFromParam = (raw: string | undefined): MonitoringTab =>
  TABS.find(tab => tab === raw) ?? DEFAULT_TAB;

/**
 * The sort keys each table offers — exactly the generated sort-field unions.
 * Every other column is unsortable because the schema has no key for it, not
 * by a UI choice (contract › breaches, › the log).
 */
export type BreachSortKey = NonNullable<
  TemperatureBreachesVariables['sort']
>[number]['key'];
export type LogSortKey = NonNullable<
  TemperatureLogsVariables['sort']
>[number]['key'];
export const BREACH_SORT_KEYS: readonly BreachSortKey[] = [
  'startDatetime',
  'endDatetime',
] as const;
export const LOG_SORT_KEYS: readonly LogSortKey[] = [
  'datetime',
  'temperature',
] as const;

export type MonitoringState = {
  filter: MonitoringFilter;
  /** Single-element: the server evaluates exactly one entry (contract ⚠️). */
  breachSort: NonNullable<TemperatureBreachesVariables['sort']>;
  breachOffset: number;
  logSort: NonNullable<TemperatureLogsVariables['sort']>;
  logOffset: number;
  /** Rows per page, shared by both tables. */
  first: number;
};

/**
 * Arrival state. The two start bounds and the Unacknowledged switch are
 * seeded PRESENT-but-empty — `null` is an added-but-empty chip — so they sit
 * on the bar from arrival with no menu step (ui-surface S1 § filters: shown
 * "by default"). Sensor name, Location and Breach type are added from the
 * filter menu.
 *
 * Breaches list newest first by start; readings oldest first (rules ›
 * breaches, › the log).
 */
export const DEFAULT_STATE: MonitoringState = {
  filter: { fromStart: null, toStart: null, unacknowledged: null },
  breachSort: [{ key: 'startDatetime', desc: true }],
  breachOffset: 0,
  logSort: [{ key: 'datetime', desc: false }],
  logOffset: 0,
  first: DEFAULT_PAGE_SIZE,
};

/** The default window: the last 24 hours, ending now (rules › the chart). */
export const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Whether arriving at the screen adopts the default window. It is adopted
 * only on a PRISTINE arrival — an address carrying no query state at all.
 * An address that names a filter, bounds included or not, is honoured as
 * written: a user who cleared both bounds to see everything, or a hand-off
 * that narrows to a sensor across its whole history, must not have a day
 * re-imposed on reload (rules › the chart: "arriving without an explicit
 * range adopts it and records it in the address").
 */
export const needsArrivalWindow = (
  rawQueryParam: string | undefined
): boolean => rawQueryParam === undefined || rawQueryParam === '';

/** The filter with the default window written into its two bounds. */
export const withDefaultWindow = (
  filter: MonitoringFilter,
  now: Date
): MonitoringFilter => ({
  ...filter,
  fromStart: new Date(now.getTime() - DEFAULT_WINDOW_MS).toISOString(),
  toStart: now.toISOString(),
});

/**
 * The window the chart plots, in epoch milliseconds (rules › the chart):
 *
 * - both bounds → as given, however narrow or wide;
 * - an end but no start → the 24 hours before that end;
 * - a start but no end → from that start up to now;
 * - neither → `undefined`: nothing bounds the read, and the plot spans the
 *   readings it receives.
 */
export const chartWindow = (
  filter: MonitoringFilter,
  now: Date
): { start: number; end: number } | undefined => {
  const from = filter.fromStart ? Date.parse(filter.fromStart) : undefined;
  const to = filter.toStart ? Date.parse(filter.toStart) : undefined;
  if (from !== undefined && to !== undefined) return { start: from, end: to };
  if (to !== undefined) return { start: to - DEFAULT_WINDOW_MS, end: to };
  if (from !== undefined)
    return { start: from, end: Math.max(now.getTime(), from) };
  return undefined;
};

type SensorFilter = NonNullable<
  NonNullable<TemperatureBreachesVariables['filter']>['sensor']
>;
type LocationFilter = NonNullable<
  NonNullable<TemperatureBreachesVariables['filter']>['location']
>;
type DatetimeBounds = NonNullable<
  NonNullable<TemperatureBreachesVariables['filter']>['startDatetime']
>;

// Sensor NAME, substring (rules: filters are sensor name and location code).
const sensorFilter = (f: MonitoringFilter): SensorFilter | null =>
  f.sensorName ? { name: { like: f.sensorName } } : null;

// Location CODE, substring — never the name (rules › the monitoring screen).
const locationFilter = (f: MonitoringFilter): LocationFilter | null =>
  f.locationCode ? { code: { like: f.locationCode } } : null;

// The two chips as inclusive bounds; an empty chip contributes nothing, and a
// pair of empty chips is no filter at all (stripEmpty drops the empty object).
const startBounds = (f: MonitoringFilter): DatetimeBounds =>
  stripEmpty({
    afterOrEqualTo: f.fromStart || null,
    beforeOrEqualTo: f.toStart || null,
  });

/**
 * URL state + the active store → the Breaches tab's query variables.
 *
 * - `storeId` scopes the read server-side; the filter input has no store key
 *   to widen it with (rules › store scoping).
 * - The date range binds to `startDatetime` — NEVER `endDatetime`, which
 *   silently drops every ongoing breach (contract ⚠️ wire trap).
 * - The Unacknowledged switch sends `unacknowledged: true` only while ticked;
 *   unticked it sends nothing, so acknowledged and unacknowledged breaches
 *   list together (rules › breaches). `false` — an acknowledged-only list — is
 *   not a state the switch has.
 * - `sort` is a single-element list (contract ⚠️ wire trap: the LAST entry is
 *   the one evaluated — at one element the two readings coincide).
 */
export const buildBreachesVariables = (
  state: MonitoringState,
  storeId: string
): TemperatureBreachesVariables => {
  const f = state.filter;
  return {
    storeId,
    filter: stripEmpty({
      sensor: sensorFilter(f),
      location: locationFilter(f),
      startDatetime: startBounds(f),
      type: f.breachType ? { equalTo: f.breachType } : null,
      unacknowledged: f.unacknowledged === true ? true : null,
    }),
    sort: state.breachSort,
    page: { first: state.first, offset: state.breachOffset },
  };
};

/**
 * URL state + the active store → the Log tab's query variables. The same
 * five facts as the breaches read, on the log input's own keys: the range is
 * the reading's `datetime`, the breach type is the reading's
 * `temperatureBreach.type` (a reading not part of a breach then never
 * matches). The Unacknowledged switch is a breach fact and does not reach
 * this read.
 */
export const buildLogsVariables = (
  state: MonitoringState,
  storeId: string
): TemperatureLogsVariables => {
  const f = state.filter;
  return {
    storeId,
    filter: stripEmpty({
      sensor: sensorFilter(f),
      location: locationFilter(f),
      datetime: startBounds(f),
      temperatureBreach: f.breachType
        ? { type: { equalTo: f.breachType } }
        : null,
    }),
    sort: state.logSort,
    page: { first: state.first, offset: state.logOffset },
  };
};

/**
 * The chart's data-point cap (contract › the chart: 8640 — a reading every
 * ten seconds for a day). A window holding more readings than this is plotted
 * truncated, and the chart MUST say so (rules › the chart).
 */
export const CHART_POINT_CAP = 8640;

/**
 * The chart's query variables: the log read, ascending by time, at the cap,
 * over {@link chartWindow} — so an end-only range reaches the wire with its
 * derived start, and no range reaches it unbounded.
 */
export const buildChartVariables = (
  filter: MonitoringFilter,
  storeId: string,
  now: Date
): TemperatureLogsVariables => {
  const window = chartWindow(filter, now);
  return {
    storeId,
    filter: stripEmpty({
      sensor: sensorFilter(filter),
      location: locationFilter(filter),
      datetime: window
        ? {
            afterOrEqualTo: new Date(window.start).toISOString(),
            // An open-ended start plots up to now but is not capped at it on
            // the wire — a reading a few seconds ahead of this device's clock
            // is still a reading.
            ...(filter.toStart ? { beforeOrEqualTo: filter.toStart } : {}),
          }
        : null,
      temperatureBreach: filter.breachType
        ? { type: { equalTo: filter.breachType } }
        : null,
    }),
    sort: [{ key: 'datetime', desc: false }],
    page: { first: CHART_POINT_CAP, offset: 0 },
  };
};
