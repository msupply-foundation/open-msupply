import { locale } from './intl';
import { t } from './intl';
import {
  isRtl as isRtlLocale,
  SUPPORTED_LOCALES,
  type LocaleKey,
  type SupportedLocale,
} from './locales';

type StringOrEmpty = string | null | undefined;

// Human-readable language names for a switcher. The name lives in each catalog
// under `language.name`, but for the switcher we need every language's own name
// regardless of the active locale, so keep a static endonym map here.
const LANGUAGE_ENDONYM: Record<SupportedLocale, string> = {
  ar: 'العربية',
  prs: 'دری',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  'fr-DJ': 'Français (Djibouti)',
  ps: 'پښتو',
  pt: 'Português',
  ru: 'Русский',
  tet: 'Tetum',
};

export const languageOptions = SUPPORTED_LOCALES.map(value => ({
  value,
  label: LANGUAGE_ENDONYM[value],
}));

/** Whether the active locale is right-to-left (drives document.dir). */
export const isRtl = (): boolean => isRtlLocale(locale());

/** Endonym of the active language. */
export const currentLanguageName = (): string => LANGUAGE_ENDONYM[locale()];

/**
 * A person's full name for the active locale. All supported languages currently
 * use the same order; branch here when one needs a different arrangement.
 */
export const getLocalisedFullName = (
  firstName: StringOrEmpty,
  lastName: StringOrEmpty
): string => `${firstName ?? ''} ${lastName ?? ''}`.trim();

// Minimal English pluralisation for dynamic words (the reference app used the
// `pluralize` package; kept dependency-free here per the simplification spec).
// Only English is pluralised — other languages return the word unchanged.
const IRREGULAR: Record<string, string> = {
  each: 'each',
  person: 'people',
};

export const getPlural = (word: string, count: number): string => {
  if (locale() !== 'en' || count === 1) return word;
  const lower = word.toLowerCase();
  if (IRREGULAR[lower]) return IRREGULAR[lower];
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
};

/**
 * Translate a server error key. The catalog won't hold every possible server
 * message, so fall back to a sentence-cased version of the camelCase key.
 */
export const translateServerError = (serverKey: string): string => {
  const key = `server-error.${serverKey}` as LocaleKey;
  const fallback = serverKey
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase());
  const translated = t(key);
  return translated === key ? fallback : translated;
};
