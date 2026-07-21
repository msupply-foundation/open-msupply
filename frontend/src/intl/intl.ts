import { createSignal } from 'solid-js';
import * as i18n from '@solid-primitives/i18n';
import {
  DEFAULT_LOCALE,
  type FlatDict,
  type LocaleKey,
  type SupportedLocale,
} from './locales';
import { pluralCategory } from './plural';

// Global i18n state, in the codebase's plain-signal style (cf. storeContext):
// the current locale, and the flattened dictionary per locale. Dictionaries are
// filled in by loadDictionary; until then a locale's dictionary is absent and
// t() falls back to the key.
const [locale, setLocale] = createSignal<SupportedLocale>(DEFAULT_LOCALE);
const [dictionaries, setDictionaries] = createSignal<
  Partial<Record<SupportedLocale, FlatDict>>
>({});

// The active flattened dictionary — a plain accessor (not a memo): the
// primitive calls it on every lookup, reading the signals fresh, so it stays
// correct both inside a reactive root (UI re-renders on change) and outside one
// (tests).
//
// Missing-key fallback ladder (spec/i18n/behaviours.md → translating text):
// active-locale string → the English (DEFAULT_LOCALE) string → the raw key.
// A non-English catalog is partial (e.g. Arabic lacks ~1400 keys), so we layer
// the active locale OVER the English base rather than reading it alone — a key
// absent from the active locale then resolves to its English string instead of
// leaking the raw key into the UI. English keys still absent everywhere fall
// through to the key itself (t()'s `?? key`), keeping a truly-missing key
// visible, never blank. When the active locale IS English, the merge is a
// harmless self-merge.
//
// The translator calls this on EVERY t() lookup (a hot path), so the two-
// dictionary merge is cached and rebuilt only when its inputs actually change —
// keyed on the current locale plus the `dictionaries` object identity (a fresh
// reference on every setDictionaries). A plain identity cache, not createMemo:
// t() is also called ownerless (tests, and outside any reactive root), where a
// memo would have no owner to track.
let cache: { locale: SupportedLocale; dicts: object; merged: FlatDict } | null =
  null;
const activeDict = (): FlatDict => {
  const current = locale();
  const dicts = dictionaries();
  if (cache && cache.locale === current && cache.dicts === dicts)
    return cache.merged;
  const merged: FlatDict = {
    ...(dicts[DEFAULT_LOCALE] ?? {}),
    ...(dicts[current] ?? {}),
  };
  cache = { locale: current, dicts, merged };
  return merged;
};

// Matches i18next-style nested references — `$t(some.key)` — that some source
// strings use to embed one translation inside another (e.g. "Confirm status as
// $t(status.finalised)?"). @solid-primitives/i18n's resolveTemplate only knows
// `{{ tokens }}`, so without this the raw `$t(...)` leaked to the UI (#359).
const NESTED_REF = /\$t\(\s*([\w.-]+)\s*\)/g;

/**
 * Resolve i18next-style `$t(key)` nested references against the active
 * dictionary, recursively (a referenced string may itself contain `$t(...)` —
 * e.g. description.doses-quantity), with a depth cap so a self/cyclic reference
 * can't loop forever. An unknown key is left as-is so a missing translation is
 * still visible rather than silently blanked.
 */
const resolveNested = (input: string, depth = 0): string => {
  if (depth >= 5 || !input.includes('$t(')) return input;
  const dict = activeDict();
  return input.replace(NESTED_REF, (raw, key: string) => {
    const value = dict[key as LocaleKey];
    return value === undefined ? raw : resolveNested(value, depth + 1);
  });
};

// Our template resolver: run the primitive's `{{ token }}` interpolation first
// (so `$t({{status}})` becomes `$t(status.finalised)`), then resolve any
// `$t(...)` nested references. Kept as one resolver passed to the translator so
// every t()/tPlural() call gets both behaviours.
const resolveTemplate: typeof i18n.resolveTemplate = (template, ...args) =>
  resolveNested(i18n.resolveTemplate(template, ...args));

// The primitive: a reactive translator with {{ token }} interpolation plus
// $t(...) nesting (resolveTemplate above). It reads activeDict (which reads the
// signals), so every t() call site updates on locale change or when a
// dictionary loads.
const translate = i18n.translator(activeDict, resolveTemplate);

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
  return resolveTemplate(resolved, { count, ...vars });
};

export { locale, setLocale, dictionaries, setDictionaries };
