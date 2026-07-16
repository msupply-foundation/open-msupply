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
const activeDict = (): FlatDict => dictionaries()[locale()] ?? {};

// The primitive: a reactive translator with {{ token }} interpolation. It reads
// activeDict (which reads the signals), so every t() call site updates on
// locale change or when a dictionary loads.
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
