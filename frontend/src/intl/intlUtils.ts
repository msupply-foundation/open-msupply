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

/** Endonym of one language — its own name, whatever the active locale. */
export const languageName = (code: SupportedLocale): string =>
  LANGUAGE_ENDONYM[code];

/** Endonym of the active language. */
export const currentLanguageName = (): string => languageName(locale());

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
 * message, so fall back to a sentence-cased version of the camelCase key. A
 * server reason that is already a sentence (it holds whitespace) is shown as
 * it came: splitting it at every capital would break the document types and
 * schema ids it names (`DemoProgramEnrolment`, `…_v2_a1b2…`).
 */
export const translateServerError = (serverKey: string): string => {
  const key = `server-error.${serverKey}` as LocaleKey;
  const translated = t(key);
  if (translated !== key) return translated;
  if (/\s/.test(serverKey)) return serverKey;
  return serverKey
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase());
};
