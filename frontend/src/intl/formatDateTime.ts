import {
  format,
  formatDistanceToNow,
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  addMonths,
} from 'date-fns';
import type { Locale } from 'date-fns';
// Import locales individually so they tree-shake (the date-fns methods do; the
// locale objects need explicit imports). Add one per supported language.
import { enGB } from 'date-fns/locale/en-GB';
import { fr } from 'date-fns/locale/fr';
import { ar } from 'date-fns/locale/ar';
import type { SupportedLocale } from './locales';
import { locale, tPlural } from './intl';

const DATE_FNS_LOCALE: Record<SupportedLocale, Locale> = { en: enGB, fr, ar };

const dateFnsLocale = (l?: SupportedLocale): Locale =>
  DATE_FNS_LOCALE[l ?? locale()];

const toDate = (value: Date | string | number): Date =>
  value instanceof Date ? value : new Date(value);

// Locale-aware date/time formatting bound to the current locale. Plain
// functions in the app's direct-call style; each reads locale() so use within
// an effect stays reactive.
export const localisedDate = (value: Date | string | number): string =>
  format(toDate(value), 'P', { locale: dateFnsLocale() });

export const localisedTime = (value: Date | string | number): string =>
  format(toDate(value), 'p', { locale: dateFnsLocale() });

export const localisedDateTime = (value: Date | string | number): string =>
  format(toDate(value), 'Pp', { locale: dateFnsLocale() });

export const customDate = (
  value: Date | string | number,
  formatString: string
): string => format(toDate(value), formatString, { locale: dateFnsLocale() });

export const localisedDistanceToNow = (value: Date | string | number): string =>
  formatDistanceToNow(toDate(value), {
    locale: dateFnsLocale(),
    addSuffix: true,
  });

// Friendly age for display, relative to today: whole years once a patient is
// at least one year old ("31 years", "1 year"), otherwise months and days
// ("5 months, 18 days", "10 days"). Mirrors the current app's getDisplayAge so
// the two front ends read identically (spec/patients rules § age). Returns ''
// for a missing or future date of birth, so callers fall back to the date.
export const getDisplayAge = (dateOfBirth: Date | string | number): string => {
  const now = new Date();
  const dob = toDate(dateOfBirth);
  if (dob.getTime() > now.getTime()) return '';
  const years = differenceInYears(now, dob);
  if (years >= 1) return tPlural('label.age-years', years);
  const months = differenceInMonths(now, dob);
  const days = differenceInDays(now, addMonths(dob, months));
  return `${months > 0 ? tPlural('label.age-months-and', months) : ''}${tPlural(
    'label.age-days',
    days
  )}`;
};
