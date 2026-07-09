import * as i18n from '@solid-primitives/i18n';
import type { BaseRecordDict } from '@solid-primitives/i18n';
import { locale as activeLocale, setDictionaries } from './intl';
import type { FlatDict, SupportedLocale } from './locales';
import { clearCache, readCache, writeCache } from './dictionaryCache';
import { fetchCustomTranslations } from './customTranslations';

// Load the bundled `common` catalog for a locale. The template-literal import
// lets webpack code-split each language into its own chunk, loaded on demand
// (CLAUDE.md: lazy loading). Missing/failed load → empty catalog.
const loadCommon = async (locale: SupportedLocale): Promise<BaseRecordDict> => {
  try {
    const module = await import(`./locales/${locale}/common.json`);
    return (module.default ?? module) as BaseRecordDict;
  } catch {
    return {};
  }
};

const merge = (locale: SupportedLocale, dict: FlatDict): void => {
  setDictionaries(previous => ({ ...previous, [locale]: dict }));
};

/**
 * Ensure the dictionary for a locale is loaded into global state. Cache-first
 * (localStorage, version + TTL busted); on miss, load the bundled `common`
 * catalog and merge live `custom-translations` over it, then cache the result.
 *
 * Explicit async refetch in the app's style (cf. refetchStoreContext): callers
 * await it and keep showing a loading state until it lands. It never throws —
 * a total failure leaves an empty dictionary and t() falls back to keys.
 */
export const loadDictionary = async (locale: SupportedLocale): Promise<void> => {
  const cached = readCache(locale);
  if (cached) {
    merge(locale, cached);
    return;
  }

  const [common, custom] = await Promise.all([
    loadCommon(locale),
    fetchCustomTranslations(locale),
  ]);

  // Flatten the bundled catalog (a no-op for already-flat catalogs, but correct
  // if nested ones are added), then let custom translations override. Trusted
  // cast: our catalogs are string maps, so flatten's `unknown` values are strings
  // (kdd/type-safety: `as` permitted where we own the implementation).
  const flat: FlatDict = {
    ...(i18n.flatten(common) as FlatDict),
    ...custom,
  };

  writeCache(locale, flat);
  merge(locale, flat);
};

/**
 * Drop the cached dictionary for the active locale and reload it, picking up
 * server-side string changes. Called directly by whatever observes the need to
 * refresh — e.g. sync completion (kdd/explicit-composition) —
 * rather than through a subscriber registry.
 */
export const invalidateCustomTranslations = async (): Promise<void> => {
  const locale = activeLocale();
  clearCache(locale);
  await loadDictionary(locale);
};
