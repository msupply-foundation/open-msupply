// Supported locales, their metadata, and the typed key set.
//
// LocaleKey is derived from the English source catalog (type-only import, so the
// JSON isn't bundled here). Plural keys in the catalog carry CLDR suffixes
// (`_one`, `_other`, …); we normalise those so the base key (`login.failed-attempts`)
// is also a valid LocaleKey — that's what tPlural is called with.
import type commonEn from './locales/en/common.json';

type PluralSuffix = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
type NormalizeKey<K> = K extends `${infer Base}_${PluralSuffix}` ? Base | K : K;

export type LocaleKey = NormalizeKey<keyof typeof commonEn>;

// The runtime shape of a loaded, flattened dictionary. Values are plain strings
// (templates with {{ tokens }}); the primitive's translator reads this record.
export type FlatDict = Partial<Record<string, string>>;

export const SUPPORTED_LOCALES = ['en', 'fr', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const isSupported = (code: string): code is SupportedLocale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(code);

// Locale metadata. `numberLocale` overrides the BCP-47 tag passed to Intl so
// digit systems render correctly (see formatNumber). `dir` drives document.dir.
type LocaleMeta = {
  readonly dir: 'ltr' | 'rtl';
  readonly numberLocale: string;
};

export const LOCALE_META: Record<SupportedLocale, LocaleMeta> = {
  en: { dir: 'ltr', numberLocale: 'en' },
  fr: { dir: 'ltr', numberLocale: 'fr' },
  // Arabic-Indic digits (٠-٩) rather than Latin.
  ar: { dir: 'rtl', numberLocale: 'ar-u-nu-arab' },
};

export const isRtl = (locale: SupportedLocale): boolean =>
  LOCALE_META[locale].dir === 'rtl';
