import {
  format,
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  differenceInCalendarDays,
  addMonths,
} from 'date-fns';
import type { Locale } from 'date-fns';
import { createSignal } from 'solid-js';
// English is the fallback every other language resolves through, so it's the
// one locale worth carrying statically.
import { enGB } from 'date-fns/locale/en-GB';
import type { SupportedLocale } from './locales';
import { locale, t, tPlural } from './intl';

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
  // Lao has no date-fns locale either; English (GB), as in the current app.
  lo: () => Promise.resolve(enGB),
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
>({ en: enGB, lo: enGB, tet: enGB });

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

// A calendar date (`YYYY-MM-DD`) carries no zone, but parsing one as an INSTANT
// puts it at UTC midnight: west of Greenwich that is the previous local day,
// and east of it the local morning is still "before" the date. Ages of the very
// young are what notice — a baby born today reads as a day old in New York, and
// in Auckland the date of birth looks like the future and no age shows at all.
// Split the fields and build a local date instead.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const toCalendarDate = (value: Date | string | number): Date => {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return toDate(value);
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

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

/*
 * The BCP-47 tag to hand Intl for a supported language. Mirrors the date-fns
 * substitutions above, so the two formatters never disagree about which
 * language a user is reading: Dari and Pashto borrow Persian, and Tetum and Lao
 * — which date-fns doesn't carry — fall back to the app's English rather than
 * to whatever the browser happens to be set to, which is what Intl would pick
 * on its own for an unknown tag. (Intl does know `lo`, but a Lao date beside an
 * English one from date-fns would be worse than either alone.)
 */
const INTL_TAGS: Record<SupportedLocale, string> = {
  ar: 'ar',
  prs: 'fa-IR',
  en: 'en-GB',
  es: 'es',
  fr: 'fr',
  'fr-DJ': 'fr',
  lo: 'en-GB',
  ps: 'fa-IR',
  pt: 'pt',
  ru: 'ru',
  tet: 'en-GB',
};

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

/*
 * How long ago a moment was, in the fewest words that stay honest (issue
 * #1087) — for a standing indicator that is re-read at a glance, many times a
 * day, and must not grow wider than the state it qualifies:
 *
 *   under a minute → "just now"      (a count of seconds is noise)
 *   under an hour  → "2 min ago"
 *   under a day    → "3 hr ago"
 *   yesterday      → "yesterday"     (a calendar day, not a 24-hour window)
 *   older          → "14 Aug"        (relative stops being informative)
 *
 * Intl.RelativeTimeFormat, not date-fns's formatDistance: `style: 'narrow'`
 * yields the short forms above and the correct short forms in every other
 * language, where date-fns gives full words and hedges ("about 9 hours ago").
 * It is also native, so it costs no locale chunk.
 *
 * `numeric: 'auto'` is what turns the day rung into the word "yesterday"
 * instead of "1 day ago"; the rungs above pass 'always', since "this minute"
 * would be a worse reading of a 40-second-old sync than "just now".
 */
export const localisedTimeAgo = (
  value: Date | string | number,
  now: Date = new Date()
): string => {
  const then = toDate(value);
  const elapsed = now.getTime() - then.getTime();
  const tag = INTL_TAGS[locale()];
  const rtf = (numeric: 'always' | 'auto') =>
    new Intl.RelativeTimeFormat(tag, { style: 'narrow', numeric });

  // A clock skewed into the future reads as the present, never as a countdown.
  if (elapsed < MINUTE_MS) return t('label.just-now');
  if (elapsed < HOUR_MS)
    return rtf('always').format(-Math.floor(elapsed / MINUTE_MS), 'minute');
  if (elapsed < 24 * HOUR_MS)
    return rtf('always').format(-Math.floor(elapsed / HOUR_MS), 'hour');
  // Past a day, "yesterday" is a CALENDAR fact: 30 hours ago can be two dates
  // back, and calling that yesterday would be wrong.
  const days = differenceInCalendarDays(now, then);
  if (days === 1) return rtf('auto').format(-1, 'day');
  return format(then, 'd MMM', { locale: dateFnsLocale() });
};

// Friendly age for display, relative to today: whole years once a patient is
// at least one year old ("31 years", "1 year"), otherwise months and days
// ("5 months, 18 days", "10 days"). Mirrors the current app's getDisplayAge so
// the two front ends read identically (spec/patients rules § age). Returns ''
// for a missing or future date of birth, so callers fall back to the date.
export const getDisplayAge = (dateOfBirth: Date | string | number): string => {
  const now = new Date();
  const dob = toCalendarDate(dateOfBirth);
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
