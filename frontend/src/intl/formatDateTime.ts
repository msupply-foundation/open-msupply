import { format, formatDistanceToNow, formatDistance, differenceInYears } from 'date-fns';
import type { Locale } from 'date-fns';
// Import locales individually so they tree-shake (the date-fns methods do; the
// locale objects need explicit imports). Add one per supported language.
import { enGB } from 'date-fns/locale/en-GB';
import { fr } from 'date-fns/locale/fr';
import { ar } from 'date-fns/locale/ar';
import type { SupportedLocale } from './locales';
import { locale } from './intl';

const DATE_FNS_LOCALE: Record<SupportedLocale, Locale> = { en: enGB, fr, ar };

const dateFnsLocale = (l?: SupportedLocale): Locale =>
  DATE_FNS_LOCALE[l ?? locale()];

const toDate = (value: Date | string | number): Date =>
  value instanceof Date ? value : new Date(value);

// Locale-aware date/time formatting bound to the current locale. Plain functions
// in the app's direct-call style; each reads locale() so use within an effect
// stays reactive.
export const localisedDate = (value: Date | string | number): string =>
  format(toDate(value), 'P', { locale: dateFnsLocale() });

export const localisedTime = (value: Date | string | number): string =>
  format(toDate(value), 'p', { locale: dateFnsLocale() });

export const localisedDateTime = (value: Date | string | number): string =>
  format(toDate(value), 'Pp', { locale: dateFnsLocale() });

export const customDate = (
  value: Date | string | number,
  formatString: string,
): string => format(toDate(value), formatString, { locale: dateFnsLocale() });

export const localisedDistanceToNow = (value: Date | string | number): string =>
  formatDistanceToNow(toDate(value), { locale: dateFnsLocale(), addSuffix: true });

export const localisedDistance = (
  from: Date | string | number,
  to: Date | string | number,
): string => formatDistance(toDate(from), toDate(to), { locale: dateFnsLocale() });

export const getDisplayAge = (dateOfBirth: Date | string | number): number =>
  differenceInYears(new Date(), toDate(dateOfBirth));
