import { subDays } from 'date-fns';

/*
 * Locale-INDEPENDENT date arithmetic on plain ISO date strings (YYYY-MM-DD) —
 * no formatting, no locale (that's formatDateTime.ts). These operate on the
 * calendar-date values a date input (<input type="date">) and GraphQL date
 * filters exchange, so they parse/emit the same yyyy-MM-dd shape and never
 * touch time-of-day or timezone.
 */

/** Format a Date as a plain ISO calendar date (YYYY-MM-DD), in UTC. */
const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * The calendar date one day before the given ISO date (YYYY-MM-DD →
 * YYYY-MM-DD). Used to turn an EXCLUSIVE "expires before X" cut-off into the
 * INCLUSIVE `beforeOrEqualTo` the stock-line/item filters take.
 */
export const dayBefore = (isoDate: string): string =>
  toIsoDate(subDays(new Date(`${isoDate}T00:00:00Z`), 1));
