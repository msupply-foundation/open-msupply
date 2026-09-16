import {
  addDays,
  dateToIsoDate,
  isoDateToDate,
} from '../ui/elements/inputs/dateTimeConvert';

/*
 * Locale-INDEPENDENT date arithmetic on plain ISO date strings (YYYY-MM-DD) —
 * no formatting, no locale (that's formatDateTime.ts). These operate on the
 * calendar-date values a date input (<input type="date">) and GraphQL date
 * filters exchange, so they parse/emit the same yyyy-MM-dd shape and never
 * touch time-of-day or timezone (the shared conversion is date-only here).
 */

/**
 * The calendar date one day before the given ISO date (YYYY-MM-DD →
 * YYYY-MM-DD). Used to turn an EXCLUSIVE "expires before X" cut-off into the
 * INCLUSIVE `beforeOrEqualTo` the stock-line/item filters take. An unparseable
 * date passes through unchanged.
 */
export const dayBefore = (isoDate: string): string => {
  const date = isoDateToDate(isoDate);
  return date ? dateToIsoDate(addDays(date, -1)) : isoDate;
};
