import { SupportedLocales, useIntlUtils } from '@common/intl';
import {
  addMinutes,
  addDays,
  addMonths,
  addYears,
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
} from 'date-fns';
// importing individually to reduce bundle size
// the date-fns methods are tree shaking correctly
// but the locales are not. when adding, please add as below
import enGB from 'date-fns/locale/en-GB';
import enUS from 'date-fns/locale/en-US';
import fr from 'date-fns/locale/fr';
import ar from 'date-fns/locale/ar';
import es from 'date-fns/locale/es';

// Map locale string (from i18n) to locale object (from date-fns)
const getLocaleObj = { fr, ar, es };

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
    locale?: Locale;
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    firstWeekContainsDate?: number;
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
  addMonths,
  addYears,
  addCurrentTime,
  getDateOrNull: (
    date?: Date | string | null,
    format?: string
  ): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    const maybeDate =
      format && typeof date === 'string'
        ? parse(date, format, new Date())
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
  startOfDay,
  startOfToday,
  endOfDay,
  startOfYear,
  previousMonday,
  endOfWeek,

  /** Number of milliseconds in one second, i.e. SECOND = 1000*/
  SECOND,
  /** Number of milliseconds in one minute */
  MINUTE,
  /** Number of milliseconds in one hour */
  HOUR,
  /** Number of milliseconds in one day */
  DAY,
};

const getLocale = (language: SupportedLocales) => {
  switch (language) {
    case 'en':
      return navigator.language === 'en-US' ? enUS : enGB;
    case 'tet':
      return enGB;
    case 'fr-DJ':
      return fr;
    default:
      return getLocaleObj[language];
  }
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
  };
};
