import { getLocale, useIntlUtils } from '@common/intl';
import {
  addMinutes,
  addDays,
  addMonths,
  addYears,
  addHours,
  isValid,
  differenceInDays,
  differenceInMonths,
  differenceInMinutes,
  differenceInYears,
  isPast,
  isFuture,
  isThisWeek,
  isToday,
  isThisMonth,
  isAfter,
  isBefore,
  isEqual,
  isSameDay,
  format,
  parse,
  parseISO,
  fromUnixTime,
  getUnixTime,
  startOfToday,
  startOfDay,
  endOfDay,
  startOfYear,
  formatRelative,
  formatDistance,
  formatDistanceToNow,
  formatRFC3339,
  previousMonday,
  endOfWeek,
  setMilliseconds,
  addMilliseconds,
  getYear,
  Locale,
  FirstWeekContainsDate,
  ParseOptions,
} from 'date-fns';
import { getTimezoneOffset } from 'date-fns-tz';

export const MINIMUM_EXPIRY_MONTHS = 3;

const dateInputHandler = (date: Date | string | number): Date => {
  // Assume a string is an ISO date-time string
  if (typeof date === 'string') return parseISO(date);
  // Assume a number is a UNIX timestamp
  if (typeof date === 'number') return fromUnixTime(date);
  return date as Date;
};

const formatIfValid = (
  date: Date | number,
  dateFormat: string,
  options?: {
    locale: Locale;
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    firstWeekContainsDate?: FirstWeekContainsDate;
    useAdditionalWeekYearTokens?: boolean;
    useAdditionalDayOfYearTokens?: boolean;
  }
): string => (isValid(date) ? format(date, dateFormat, options) : '');

/** Adds the current time to a date object (that presumably has 00:00 as its
 * time component) -- does not mutate input Date object
 */
const addCurrentTime = (date: Date | null): Date | null => {
  if (date === null) return date;
  const d = new Date();
  const msSinceMidnight = d.getTime() - new Date(d).setHours(0, 0, 0, 0);
  const newDate = new Date(date);
  newDate.setTime(newDate.setHours(0, 0, 0, 0) + msSinceMidnight);
  return newDate;
};

// Time constants in [ms]
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const DateUtils = {
  differenceInMinutes,
  addMinutes,
  addDays,
  addHours,
  addMonths,
  addYears,
  addCurrentTime,
  getDateOrNull: (
    date?: Date | string | null,
    format?: string,
    options?: Parameters<typeof parse>[3]
  ): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    const maybeDate =
      format && typeof date === 'string'
        ? parse(date, format, new Date(), options)
        : new Date(date);
    return isValid(maybeDate) ? maybeDate : null;
  },
  minDate: (...dates: (Date | null)[]) => {
    const maybeDate = fromUnixTime(
      Math.min(
        // Ignore nulls, as they'll return a minimum of 0
        ...dates.filter(d => d !== null).map(d => getUnixTime(d as Date))
      )
    );
    return isValid(maybeDate) ? maybeDate : null;
  },

  maxDate: (...dates: (Date | null)[]) =>
    fromUnixTime(Math.max(...dates.map(d => getUnixTime(d as Date)))),
  isPast,
  isFuture,
  isExpired: (expiryDate: Date): boolean => isPast(expiryDate),
  isAlmostExpired: (
    expiryDate: Date,
    threshold = MINIMUM_EXPIRY_MONTHS
  ): boolean => differenceInMonths(expiryDate, Date.now()) <= threshold,
  isSameDay,
  isThisWeek,
  isToday,
  isThisMonth,
  isAfter,
  isBefore,
  isEqual,
  isValid,
  formatRFC3339: (date: Date | null | undefined) =>
    isValid(date) ? formatRFC3339(date as Date) : undefined,
  age: (date: Date) => differenceInYears(startOfToday(), startOfDay(date)),
  ageInDays: (date: Date | string) =>
    differenceInDays(Date.now(), dateInputHandler(date)),
  ageInMonthsAndDays: (date: Date | string) => {
    const months = differenceInMonths(Date.now(), date);
    const days = differenceInDays(Date.now(), addMonths(date, months));
    return { months, days };
  },
  startOfDay,
  startOfToday,
  endOfDay,
  startOfYear,
  previousMonday,
  endOfWeek,
  setMilliseconds,
  getCurrentYear: () => getYear(new Date()),
  formatDuration: (date: Date | string | number): string =>
    formatIfValid(dateInputHandler(date), 'HH:mm:ss'),

  /** Number of milliseconds in one second, i.e. SECOND = 1000*/
  SECOND,
  /** Number of milliseconds in one minute */
  MINUTE,
  /** Number of milliseconds in one hour */
  HOUR,
  /** Number of milliseconds in one day */
  DAY,
};

export const useFormatDateTime = () => {
  const { currentLanguage } = useIntlUtils();
  const locale = getLocale(currentLanguage);

  const urlQueryDate = 'yyyy-MM-dd';
  const urlQueryDateTime = 'yyyy-MM-dd HH:mm';

  const localisedDate = (date: Date | string | number): string =>
    formatIfValid(dateInputHandler(date), 'P', { locale });

  const localisedTime = (date: Date | string | number): string =>
    formatIfValid(dateInputHandler(date), 'p', { locale });

  const localisedDateTime = (date: Date | string | number): string =>
    format(dateInputHandler(date), 'P p', { locale });

  const dayMonthShort = (date: Date | string | number): string =>
    formatIfValid(dateInputHandler(date), 'dd MMM', { locale });

  const dayMonthTime = (date: Date | string | number): string =>
    formatIfValid(dateInputHandler(date), 'dd/MM HH:mm', { locale });

  const customDate = (
    date: Date | string | number,
    formatString: string
  ): string => formatIfValid(dateInputHandler(date), formatString, { locale });

  const relativeDateTime = (
    date: Date | string | number,
    baseDate: Date = new Date()
  ): string => {
    const d = dateInputHandler(date);
    return isValid(d) ? formatRelative(d, baseDate, { locale }) : '';
  };

  const localisedDistanceToNow = (date: Date | string | number) => {
    const d = dateInputHandler(date);
    return isValid(d) ? formatDistanceToNow(d, { locale }) : '';
  };

  const localisedDistance = (
    startDate: Date | string | number,
    endDate: Date | string | number
  ) => {
    const from = dateInputHandler(startDate);
    const to = dateInputHandler(endDate);
    return isValid(from) && isValid(to)
      ? formatDistance(from, to, { locale })
      : '';
  };

  /**
   * While getDateOrNull is naive to the timezone, the timezone will still change.
   * When converting from the assumed naive zone of GMT to the local timezone, the
   * dateTime will be wrong if the timezone is behind GMT.
   * For example: for a user in -10 timezone, a date of 24-02-2024 will become
   * 2024-02-23T13:00:00.000Z when rendered for mui datepicker.
   * This function acts in the same way as getDateOrNull, but will create a datetime
   * of start of day local time rather than start of day GMT by subtracting the local
   * timezone offset.
   * You can use this function anytime you need a datetime for mui date picker to
   * be created from a date only string. This includes date of birth, date of death
   * or any other date which is time and timezone agnostic.
   */
  const getLocalDate = (
    date?: Date | string | null,
    format?: string,
    options?: ParseOptions,
    timeZone?: string
  ): Date | null => {
    // tz passed as props options for testing purposes
    const tz = timeZone ?? new Intl.DateTimeFormat().resolvedOptions().timeZone;
    const UTCDateWithoutTime = DateUtils.getDateOrNull(date, format, options);
    const offset = UTCDateWithoutTime
      ? getTimezoneOffset(tz, UTCDateWithoutTime)
      : 0;
    return UTCDateWithoutTime
      ? addMilliseconds(UTCDateWithoutTime, -offset)
      : null;
  };

  return {
    urlQueryDate,
    urlQueryDateTime,
    customDate,
    dayMonthShort,
    dayMonthTime,
    localisedDate,
    localisedDateTime,
    localisedDistance,
    localisedDistanceToNow,
    localisedTime,
    relativeDateTime,
    getLocalDate,
  };
};
