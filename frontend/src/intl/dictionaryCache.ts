import type { FlatDict, SupportedLocale } from './locales';

// localStorage cache for loaded dictionaries. Busted two ways: a build-time
// LANG_VERSION token (a new bundle ships new strings) and a 7-day TTL. Kept
// deliberately small — one entry per locale — in the app's try/catch localStorage
// style (cf. appData.ts).
//
// Disabled entirely in dev: there LANG_VERSION is the constant 'dev', so the
// version check can never bust the cache, and a catalog edit would be masked by a
// stale entry until the TTL lapsed (7 days) or storage was cleared by hand. In dev
// the "load" is a local module import anyway (instant, HMR-invalidated on edit), so
// the cache buys nothing and only causes staleness. Prod keeps it — that's where a
// cache matters, for the real network fetch of server custom-translations.
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const keyFor = (locale: SupportedLocale) => `oms_i18n_${locale}`;
const cacheEnabled = () => LANG_VERSION !== 'dev';

type CacheEntry = { v: string; at: number; dict: FlatDict };

export const readCache = (locale: SupportedLocale): FlatDict | undefined => {
  if (!cacheEnabled()) return undefined;
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
  if (!cacheEnabled()) return;
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
