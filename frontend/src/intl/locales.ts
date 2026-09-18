// Supported locales, their metadata, and the typed key set.
//
// LocaleKey is derived from the English source catalog (type-only import, so
// the JSON isn't bundled here). Plural keys in the catalog carry CLDR suffixes
// (`_one`, `_other`, …); we normalise those so the base key
// (`login.failed-attempts`) is also a valid LocaleKey — that's what tPlural is
// called with.
import type commonEn from './locales/en/common.json';

type PluralSuffix = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
type NormalizeKey<K> = K extends `${infer Base}_${PluralSuffix}` ? Base | K : K;

export type LocaleKey = NormalizeKey<keyof typeof commonEn>;

// The runtime shape of a loaded, flattened dictionary. Values are plain strings
// (templates with {{ tokens }}); the primitive's translator reads this record.
export type FlatDict = Partial<Record<string, string>>;

// Every language the app ships, in selector order — alphabetical by romanised
// endonym (عربي, دری, English, Español, Français, …), matching the current app
// so the two front ends offer the same list. The set is fixed: a locale is only
// offered here once it has a catalog under `locales/<code>/`.
export const SUPPORTED_LOCALES = [
  'ar',
  'prs',
  'en',
  'es',
  'fr',
  'fr-DJ',
  'lo',
  'ps',
  'pt',
  'ru',
  'tet',
] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const isSupported = (code: string): code is SupportedLocale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(code);

// Locale metadata. `numberLocale` overrides the BCP-47 tag passed to Intl so
// digit systems render correctly (see formatNumber). `dir` drives document.dir.
// `base` names the locale a regional variant sits on top of: its catalog is a
// thin overlay, and every key it doesn't restate resolves through the base
// before English (see intl.ts → activeDict).
type LocaleMeta = {
  readonly dir: 'ltr' | 'rtl';
  readonly numberLocale: string;
  readonly base?: SupportedLocale;
};

export const LOCALE_META: Record<SupportedLocale, LocaleMeta> = {
  // Arabic-Indic digits (٠-٩) rather than Latin.
  ar: { dir: 'rtl', numberLocale: 'ar-u-nu-arab' },
  // Dari (prs) and Pashto (ps), Afghanistan — both render extended-Arabic
  // digits (۰-۹). Tagging the numbering system doesn't work: ICU pins `ps` to
  // Latin digits and silently ignores a `-u-nu-arabext` override on it. Afghan
  // Persian (`fa-AF`) natively uses the same digits and separators, so both
  // languages format through it.
  prs: { dir: 'rtl', numberLocale: 'fa-AF' },
  en: { dir: 'ltr', numberLocale: 'en' },
  es: { dir: 'ltr', numberLocale: 'es' },
  fr: { dir: 'ltr', numberLocale: 'fr' },
  'fr-DJ': { dir: 'ltr', numberLocale: 'fr', base: 'fr' },
  lo: { dir: 'ltr', numberLocale: 'lo' },
  ps: { dir: 'rtl', numberLocale: 'fa-AF' },
  pt: { dir: 'ltr', numberLocale: 'pt' },
  ru: { dir: 'ltr', numberLocale: 'ru' },
  // Tetum has no ICU data; format its numbers as English (US).
  tet: { dir: 'ltr', numberLocale: 'en-US' },
};

export const isRtl = (locale: SupportedLocale): boolean =>
  LOCALE_META[locale].dir === 'rtl';
