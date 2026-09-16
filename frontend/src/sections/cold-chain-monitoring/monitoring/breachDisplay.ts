import type { LocaleKey } from '@/intl/locales';
import { formatNumber } from '@/intl';
import type { TemperatureBreachRowFragment } from '../monitoring.generated';

// How a breach and a temperature are presented (spec/cold-chain-monitoring ›
// ui-surface T2/T3/S3/S5; rules › temperature display). Framework-free so
// every mapping — the kind's two halves, the status cell, the ongoing test,
// the derived duration, the absence-not-falsiness rule — is unit-testable in
// node without a DOM.

export type BreachRow = TemperatureBreachRowFragment;
export type BreachType = BreachRow['type'];

/**
 * A breach kind is a pair of facts — hot or cold, cumulative or consecutive
 * (rules › breaches). `EXCURSION` carries neither: it is the notification-only
 * kind that no stored breach carries in normal operation, and it is presented
 * as itself rather than falling through to a cold consecutive breach (README
 * › known gaps).
 */
export type BreachKind =
  { kind: 'breach'; hot: boolean; cumulative: boolean } | { kind: 'excursion' };

export const breachKind = (type: BreachType): BreachKind =>
  type === 'EXCURSION'
    ? { kind: 'excursion' }
    : {
        kind: 'breach',
        hot: type.startsWith('HOT'),
        cumulative: type.endsWith('CUMULATIVE'),
      };

/**
 * Which glyph a kind takes: a sun for hot, a snowflake for cold (ui-surface
 * T2 column 9), and an alert glyph for an excursion, which is neither.
 */
export type BreachGlyph = 'hot' | 'cold' | 'excursion';

export const breachGlyph = (type: BreachType): BreachGlyph =>
  type === 'EXCURSION' ? 'excursion' : type.startsWith('HOT') ? 'hot' : 'cold';

/** The kind's FULL name — the glyph's accessible label, the filter option. */
export const breachTypeLabelKey = (type: BreachType): LocaleKey => {
  switch (type) {
    case 'COLD_CUMULATIVE':
      return 'label.cold-cumulative';
    case 'COLD_CONSECUTIVE':
      return 'label.cold-consecutive';
    case 'HOT_CUMULATIVE':
      return 'label.hot-cumulative';
    case 'HOT_CONSECUTIVE':
      return 'label.hot-consecutive';
    case 'EXCURSION':
      return 'label.excursion';
  }
};

/**
 * The word beside the glyph in the Type / Breach type columns — Cumulative or
 * Consecutive, the half the glyph does not carry; Excursion names itself.
 */
export const breachShapeLabelKey = (type: BreachType): LocaleKey => {
  const kind = breachKind(type);
  if (kind.kind === 'excursion') return 'label.excursion';
  return kind.cumulative ? 'label.cumulative' : 'label.consecutive';
};

/**
 * A breach with no end is ONGOING (README › entities): the single fact that
 * gates acknowledgement, disqualifies it from any end-date filter, and leaves
 * its recorded duration at zero.
 */
export const isOngoing = (breach: { endDatetime: string | null }): boolean =>
  breach.endDatetime == null;

/**
 * The status column's icon cell (ui-surface T2 column 1): an unacknowledged
 * breach offers the acknowledge action; an acknowledged one with a comment
 * offers that comment; an acknowledged one without offers nothing (rules ›
 * acknowledging a breach). Note the inversion — the stored flag is
 * `unacknowledged`.
 */
export type StatusCell =
  | { kind: 'acknowledge' }
  | { kind: 'comment'; comment: string }
  | { kind: 'none' };

export const statusCell = (breach: {
  unacknowledged: boolean;
  comment: string | null;
}): StatusCell => {
  if (breach.unacknowledged) return { kind: 'acknowledge' };
  if (breach.comment) return { kind: 'comment', comment: breach.comment };
  return { kind: 'none' };
};

/** The Status column's word (ui-surface T2 column 2). */
export const statusLabelKey = (breach: {
  unacknowledged: boolean;
}): LocaleKey =>
  breach.unacknowledged ? 'label.unacknowledged' : 'label.acknowledged';

/**
 * An elapsed span as whole days, hours and minutes — DERIVED from start and
 * end, never read off `durationMilliseconds`: that stored column is 0 for an
 * ongoing breach (contract ⚠️ wire trap), so a breach's duration is either
 * this or the word Ongoing, never the field. Negative or non-finite input
 * (an end before its start, an unparseable instant) collapses to zero.
 */
export type DurationParts = { days: number; hours: number; minutes: number };

export const durationParts = (start: string, end: string): DurationParts => {
  const ms = Date.parse(end) - Date.parse(start);
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 60_000) : 0;
  return {
    days: Math.floor(total / (24 * 60)),
    hours: Math.floor((total % (24 * 60)) / 60),
    minutes: total % 60,
  };
};

/**
 * The two most significant non-zero units of a span, as [unit, count]
 * pairs — "2 d 3 h", "3 h 5 min", "45 min"; a span under a minute is
 * "0 min" rather than nothing, so a very short breach still reads as a span.
 */
export const durationUnits = (
  parts: DurationParts
): [unit: 'day' | 'hour' | 'minute', count: number][] => {
  const all: [unit: 'day' | 'hour' | 'minute', count: number][] = [
    ['day', parts.days],
    ['hour', parts.hours],
    ['minute', parts.minutes],
  ];
  const significant = all.filter(([, count]) => count > 0).slice(0, 2);
  return significant.length > 0 ? significant : [['minute', 0]];
};

/** The span, formatted for the locale through Intl's unit style. */
export const formatDuration = (start: string, end: string): string =>
  durationUnits(durationParts(start, end))
    .map(([unit, count]) =>
      formatNumber(count, { style: 'unit', unit, unitDisplay: 'short' })
    )
    .join(' ');

/**
 * Whether a temperature is PRESENT. The test is absence, never falsiness: a
 * reading of exactly 0 °C is a reading — the freezing point a vaccine store
 * exists to stay above — and MUST be shown wherever a temperature appears
 * (rules › temperature display; README › known gaps).
 */
export const hasTemperature = (
  value: number | null | undefined
): value is number => value != null;

/**
 * A temperature with its unit, in the active locale, at most two decimals
 * (rules › temperature display) — the tables' cells.
 */
export const formatTemperature = (value: number): string =>
  formatNumber(value, {
    style: 'unit',
    unit: 'celsius',
    unitDisplay: 'short',
    maximumFractionDigits: 2,
  });

/**
 * The bare figure, at most two decimals, for the copy that carries its own
 * "°C" (`messages.temperature`, `messages.last-temperature`).
 */
export const formatTemperatureValue = (value: number): string =>
  formatNumber(value, { maximumFractionDigits: 2 });
