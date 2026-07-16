import { DEFAULT_LOCALE, isSupported, type SupportedLocale } from './locales';

// Where a user's chosen locale is persisted, keyed by username (cf.
// appData.ts).
const USER_LOCALE_KEY = 'oms_i18n_user_locale';
// Where the last active locale is remembered for first paint before login.
const LAST_LOCALE_KEY = 'oms_i18n_last_locale';

const readUserLocales = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(USER_LOCALE_KEY) ?? '{}');
  } catch {
    return {};
  }
};

export const getUserLocale = (
  username: string
): SupportedLocale | undefined => {
  const stored = readUserLocales()[username];
  return stored && isSupported(stored) ? stored : undefined;
};

export const persistUserLocale = (
  username: string,
  locale: SupportedLocale
): void => {
  try {
    const all = readUserLocales();
    all[username] = locale;
    localStorage.setItem(USER_LOCALE_KEY, JSON.stringify(all));
  } catch {
    // best-effort
  }
  rememberLastLocale(locale);
};

export const rememberLastLocale = (locale: SupportedLocale): void => {
  try {
    localStorage.setItem(LAST_LOCALE_KEY, locale);
  } catch {
    // best-effort
  }
};

// Normalise a BCP-47 tag to a supported locale (e.g. `fr-FR` → `fr`).
const normalise = (tag?: string | null): SupportedLocale | undefined => {
  if (!tag) return undefined;
  if (isSupported(tag)) return tag;
  const base = tag.split('-')[0];
  return base && isSupported(base) ? base : undefined;
};

/**
 * Resolve the initial locale for first paint. Order: `?lng=` querystring →
 * last-active (localStorage) → the browser's preferred languages → default.
 * Language is normally set from the user profile on login (changeLanguage);
 * this covers first paint and refresh. A small pure function rather than a
 * plugin chain.
 */
export const detectLocale = (): SupportedLocale => {
  try {
    const qs = new URLSearchParams(window.location.search).get('lng');
    const fromQuery = normalise(qs);
    if (fromQuery) return fromQuery;

    const fromStorage = normalise(localStorage.getItem(LAST_LOCALE_KEY));
    if (fromStorage) return fromStorage;

    for (const tag of navigator.languages ?? [navigator.language]) {
      const fromBrowser = normalise(tag);
      if (fromBrowser) return fromBrowser;
    }
  } catch {
    // window/navigator/localStorage unavailable — fall through to default.
  }
  return DEFAULT_LOCALE;
};
