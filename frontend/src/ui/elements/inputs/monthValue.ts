/*
 * MonthField's value: a calendar month, `YYYY-MM`. Months compare
 * chronologically as plain strings, as `YYYY-MM-DD` dates do.
 */

export interface YearMonth {
  year: number;
  /** 0–11, as JS Date months are. */
  month: number;
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** The year and month of a `YYYY-MM` value, or null when it isn't one. */
export const parseMonthValue = (
  value: string | null | undefined
): YearMonth | null => {
  const match = value ? MONTH.exec(value) : null;
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1 };
};

/** `YYYY-MM` for a year and a 0–11 month. */
export const toMonthValue = (year: number, month: number): string =>
  `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}`;

/** The month a local date falls in. */
export const monthOfDate = (date: Date): string =>
  toMonthValue(date.getFullYear(), date.getMonth());

/** The month `count` months after `value` (before it when negative). */
export const addMonths = (value: string, count: number): string => {
  const ym = parseMonthValue(value);
  if (!ym) return value;
  const d = new Date(ym.year, ym.month + count, 1);
  return monthOfDate(d);
};

/**
 * The first and last calendar dates of the month, `YYYY-MM-DD`, or null when
 * the value isn't a month.
 */
export const monthDateRange = (
  value: string | null | undefined
): { start: string; end: string } | null => {
  const ym = parseMonthValue(value);
  if (!ym) return null;
  const lastDay = new Date(ym.year, ym.month + 1, 0).getDate();
  const prefix = toMonthValue(ym.year, ym.month);
  return {
    start: `${prefix}-01`,
    end: `${prefix}-${String(lastDay).padStart(2, '0')}`,
  };
};

/** Whether `value` lies outside `min`/`max` (each optional, inclusive). */
export const isMonthOutside = (
  value: string,
  min?: string,
  max?: string
): boolean =>
  (min !== undefined && value < min) || (max !== undefined && value > max);

/** "August 2026", in the given locale; '' when the value isn't a month. */
export const formatMonth = (
  value: string | null | undefined,
  localeCode: string
): string => {
  const ym = parseMonthValue(value);
  if (!ym) return '';
  // Gregorian, the calendar the value is in: left to the browser, Dari and
  // Pashto would name a Solar Hijri month and year
  return new Date(ym.year, ym.month, 1).toLocaleDateString(localeCode, {
    month: 'long',
    year: 'numeric',
    calendar: 'gregory',
  });
};
