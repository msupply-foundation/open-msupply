import { createSignal } from 'solid-js';
import { sameFetchedValue } from '../typeHelpers';
import * as i18n from '@solid-primitives/i18n';
import {
  DEFAULT_LOCALE,
  LOCALE_META,
  type FlatDict,
  type LocaleKey,
  type SupportedLocale,
} from './locales';
import { pluralCategory } from './plural';
import { pluginDictionaries } from './pluginTranslations';

// Global i18n state, in the codebase's plain-signal style (cf. storeContext):
// the current locale, and the flattened dictionary per locale. Dictionaries are
// filled in by loadDictionary; until then a locale's dictionary is absent and
// t() falls back to the key.
const [locale, setLocale] = createSignal<SupportedLocale>(DEFAULT_LOCALE);
// `equals: sameFetchedValue` — invalidateCustomTranslations reloads the active
// catalogue on every completed sync run (api/syncStore § onRunCompleted), and
// loadDictionary republishes with a spread, so the object identity always
// changed even when no string did. t() is called inside cell renderers, so every
// consumer re-ran: table cells re-rendered and their inputs were replaced,
// losing focus and any half-typed value. The compare serialises the whole
// multi-locale record — both sides — once per load, and saves a full UI
// re-render per sync.
const [dictionaries, setDictionaries] = createSignal<
  Partial<Record<SupportedLocale, FlatDict>>
>({}, { equals: sameFetchedValue });

// The active flattened dictionary — a plain accessor (not a memo): the
// primitive calls it on every lookup, reading the signals fresh, so it stays
// correct both inside a reactive root (UI re-renders on change) and outside one
// (tests).
//
// Missing-key fallback ladder (spec/i18n/behaviours.md → translating text):
// active-locale string → its base locale's string, if it has one → the English
// (DEFAULT_LOCALE) string → the raw key. A non-English catalog is partial (e.g.
// Arabic lacks ~1400 keys), so we layer the active locale OVER the English base
// rather than reading it alone — a key absent from the active locale then
// resolves to its English string instead of leaking the raw key into the UI.
// English keys still absent everywhere fall through to the key itself (t()'s
// `?? key`), keeping a truly-missing key visible, never blank. When the active
// locale IS English, the merge is a harmless self-merge.
//
// A regional variant (LOCALE_META `base` — `fr-DJ` over `fr`) ships only the
// handful of strings it changes, so its base's catalog goes in between: French
// (Djibouti) reads as French everywhere it doesn't deliberately differ, rather
// than falling all the way back to English.
//
// Installed plugins' catalogues form a layer BENEATH the host's, keyed in their
// own namespace (`${code}:${key}` — src/intl/pluginTranslations.ts). Order is
// plugin-English → plugin-locale → host-English → host-locale, which gives the
// plugin rules two behaviours for free: a plugin key missing from the active
// locale falls back to the plugin's English string and then to the namespaced
// key itself (AC-PLUG-I1), and a server custom translation for a namespaced key
// — which arrives in the HOST dictionary — overrides the plugin's bundled
// string (AC-PLUG-I2). Keeping the layer separate is also what makes it survive
// loadDictionary replacing a whole locale's dictionary.
//
// The translator calls this on EVERY t() lookup (a hot path), so the merge is
// cached and rebuilt only when its inputs actually change — keyed on the
// current locale plus the `dictionaries` AND `pluginDictionaries` object
// identities (each a fresh reference on every set). A plain identity cache, not
// createMemo: t() is also called ownerless (tests, and outside any reactive
// root), where a memo would have no owner to track.
let cache: {
  locale: SupportedLocale;
  dicts: object;
  pluginDicts: object;
  merged: FlatDict;
} | null = null;
const activeDict = (): FlatDict => {
  const current = locale();
  const dicts = dictionaries();
  const pluginDicts = pluginDictionaries();
  if (
    cache &&
    cache.locale === current &&
    cache.dicts === dicts &&
    cache.pluginDicts === pluginDicts
  )
    return cache.merged;
  const base = LOCALE_META[current].base;
  const merged: FlatDict = {
    ...(pluginDicts[DEFAULT_LOCALE] ?? {}),
    ...(base ? (pluginDicts[base] ?? {}) : {}),
    ...(pluginDicts[current] ?? {}),
    ...(dicts[DEFAULT_LOCALE] ?? {}),
    ...(base ? (dicts[base] ?? {}) : {}),
    ...(dicts[current] ?? {}),
  };
  cache = { locale: current, dicts, pluginDicts, merged };
  return merged;
};

// The primitive: a reactive translator with {{ token }} interpolation. It
// reads activeDict (which reads the signals), so every t() call site updates
// on locale change or when a dictionary loads.
const translate = i18n.translator(activeDict, i18n.resolveTemplate);

/**
 * Translate a key, interpolating {{ tokens }}. Falls back to the key itself.
 */
export const t = (
  key: LocaleKey,
  vars?: Record<string, string | number>
): string => translate(key, vars) ?? key;

/**
 * Translate a pluralised key. The catalog holds `${key}_${category}` entries
 * (e.g. `login.failed-attempts_one`); we pick the CLDR category for the count
 * in the active locale, then interpolate {{ count }}.
 */
export const tPlural = (
  key: LocaleKey,
  count: number,
  vars?: Record<string, string | number>
): string => {
  const category = pluralCategory(locale(), count);
  const pluralKey = `${key}_${category}` as LocaleKey;
  // Fall back to _other if the specific category is missing from the catalog.
  const resolved =
    translate(pluralKey) ?? translate(`${key}_other` as LocaleKey);
  if (resolved === undefined) return key;
  return i18n.resolveTemplate(resolved, { count, ...vars });
};

export { locale, setLocale, dictionaries, setDictionaries };
