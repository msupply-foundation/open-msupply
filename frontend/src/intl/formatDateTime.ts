import {
  format,
  formatDistanceToNow,
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  addMonths,
} from 'date-fns';
import type { Locale } from 'date-fns';
import { createSignal } from 'solid-js';
// English is the fallback every other language resolves through, so it's the
// one locale worth carrying statically.
import { enGB } from 'date-fns/locale/en-GB';
import type { SupportedLocale } from './locales';
import { locale, tPlural } from './intl';

// The rest load on demand, one chunk each, alongside the language's dictionary
// (changeLanguage → loadLocaleAssets): a date-fns locale is 7–14 KB gzipped and
// ten of them statically imported would be ~6% of the bundle spent on languages
// a given user never selects. The date-fns methods themselves tree-shake; the
// locale objects don't, which is why they need explicit imports.
const DATE_FNS_LOADERS: Record<SupportedLocale, () => Promise<Locale>> = {
  ar: () => import('date-fns/locale/ar').then(m => m.ar),
  // Persian/Farsi, the closest available match for the unsupported Dari and
  // Pashto (as in the current app).
  prs: () => import('date-fns/locale/fa-IR').then(m => m.faIR),
  en: () => Promise.resolve(enGB),
  es: () => import('date-fns/locale/es').then(m => m.es),
  fr: () => import('date-fns/locale/fr').then(m => m.fr),
  'fr-DJ': () => import('date-fns/locale/fr').then(m => m.fr),
  ps: () => import('date-fns/locale/fa-IR').then(m => m.faIR),
  pt: () => import('date-fns/locale/pt').then(m => m.pt),
  ru: () => import('date-fns/locale/ru').then(m => m.ru),
  // Tetum has no date-fns locale; English (GB) formatting stands in.
  tet: () => Promise.resolve(enGB),
};

// Loaded locale objects, in the module's plain-signal style — a signal (not a
// plain map) so a component formatting a date re-runs once its locale lands.
const [dateFnsLocales, setDateFnsLocales] = createSignal<
  Partial<Record<SupportedLocale, Locale>>
>({ en: enGB, tet: enGB });

/**
 * Ensure a language's date-fns locale is resident. Awaited before the locale
 * signal flips (changeLanguage), so dates are never formatted against the wrong
 * language. Never throws — a failed chunk load leaves the locale absent and
 * formatting falls back to English until the next attempt.
 */
export const loadDateFnsLocale = async (l: SupportedLocale): Promise<void> => {
  if (dateFnsLocales()[l]) return;
  try {
    const loaded = await DATE_FNS_LOADERS[l]();
    setDateFnsLocales(previous => ({ ...previous, [l]: loaded }));
  } catch {
    // best-effort; English formatting stands in
  }
};

const dateFnsLocale = (l?: SupportedLocale): Locale =>
  dateFnsLocales()[l ?? locale()] ?? enGB;

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
