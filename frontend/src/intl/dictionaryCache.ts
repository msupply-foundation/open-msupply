import type { FlatDict, SupportedLocale } from './locales';

// localStorage cache for loaded dictionaries. Busted two ways: a build-time
// LANG_VERSION token (a new bundle ships new strings) and a 7-day TTL. Kept
// deliberately small — one entry per locale — in the app's try/catch localStorage
// style (cf. appData.ts).
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const keyFor = (locale: SupportedLocale) => `oms_i18n_${locale}`;

type CacheEntry = { v: string; at: number; dict: FlatDict };

export const readCache = (locale: SupportedLocale): FlatDict | undefined => {
  try {
    const raw = localStorage.getItem(keyFor(locale));
    if (!raw) return undefined;
    const { v, at, dict } = JSON.parse(raw) as CacheEntry;
    if (v !== LANG_VERSION) return undefined;
    if (Date.now() - at > TTL_MS) return undefined;
    return dict;
  } catch {
    return undefined;
  }
};

export const writeCache = (locale: SupportedLocale, dict: FlatDict): void => {
  try {
    const entry: CacheEntry = { v: LANG_VERSION, at: Date.now(), dict };
    localStorage.setItem(keyFor(locale), JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — caching is best-effort; skip silently.
  }
};

export const clearCache = (locale: SupportedLocale): void => {
  try {
    localStorage.removeItem(keyFor(locale));
  } catch {
    // ignore
  }
};
