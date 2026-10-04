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
  lo: 'ລາວ',
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
