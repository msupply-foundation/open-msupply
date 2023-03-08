import { IntlUtils, SupportedLocales } from '@common/intl';
import {
  isValid,
  differenceInMonths,
  isPast,
  isThisWeek,
  isToday,
  isThisMonth,
  isAfter,
  isBefore,
  isEqual,
  format,
  parseISO,
  fromUnixTime,
  formatRelative,
  formatDistanceToNow,
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

export const DateUtils = {
  getDateOrNull: (date?: string | null): Date | null => {
    if (!date) return null;
    const maybeDate = new Date(date);
    return isValid(maybeDate) ? maybeDate : null;
  },
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
};

const getLocale = (language: SupportedLocales) => {
  switch (language) {
    case 'en':
      return navigator.language === 'en-US' ? enUS : enGB;
    case 'tet':
      return enGB;
    default:
      return getLocaleObj[language];
  }
};

export const useFormatDateTime = () => {
  const language = IntlUtils.useCurrentLanguage();
  const locale = getLocale(language);

  const localisedDate = (date: Date | string | number): string =>
    formatIfValid(dateInputHandler(date), 'P', { locale });

  const localisedTime = (date: Date | string | number): string =>
    formatIfValid(dateInputHandler(date), 'p', { locale });

  const dayMonthShort = (date: Date | string | number): string =>
    formatIfValid(dateInputHandler(date), 'dd MMM', { locale });

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

  return {
    customDate,
    dayMonthShort,
    localisedDate,
    localisedDistanceToNow,
    localisedTime,
    relativeDateTime,
  };
};
