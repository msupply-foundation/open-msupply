import { useCallback, useContext, useState } from 'react';
import { EnvUtils, Formatter, noOtherVariants } from '@common/utils';
import { LanguageTypeNode } from '../../types/schema';
import { LocalStorage } from '../../localStorage';
import {
  LocaleKey,
  useTranslation,
  IntlContext,
  CUSTOM_TRANSLATIONS_NAMESPACE,
} from '@common/intl';
// importing individually to reduce bundle size
// the date-fns methods are tree shaking correctly
// but the locales are not. when adding, please add as below
import { enGB } from 'date-fns/locale/en-GB';
import { enUS } from 'date-fns/locale/en-US';
import { fr } from 'date-fns/locale/fr';
import { ar } from 'date-fns/locale/ar';
import { es } from 'date-fns/locale/es';
import { ru } from 'date-fns/locale/ru';
import { pt } from 'date-fns/locale/pt';
// Persian/Farsi locale, used as an approximation for the unsupported Dari and Pashto
import { faIR as fa } from 'date-fns/locale/fa-IR';

import pluralize from 'pluralize';
export { splitTranslatedLines } from './ReactUtils';

// Map locale string (from i18n) to locale object (from date-fns)
const getLocaleObj = { fr, ar, es, ru };

export const getLocale = (language: SupportedLocales) => {
  switch (language) {
    case 'en':
      return navigator.language === 'en-US' ? enUS : enGB;
    case 'tet':
      return enGB;
    case 'fr-DJ':
      return fr;
    case 'pt':
      return pt;
    case 'ps':
    case 'prs':
      return fa;
    default:
      return getLocaleObj[language];
  }
};

export const useIntl = () => useContext(IntlContext);

const languageOptions = [
  { label: 'عربي', value: 'ar' },
  { label: 'دری', value: 'prs' },
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
  { label: 'Français', value: 'fr' },
  { label: 'Français (Djibouti)', value: 'fr-DJ' },
  { label: 'پښتو', value: 'ps' },
  { label: 'Português', value: 'pt' },
  { label: 'Русский', value: 'ru' },
  { label: 'Tetum', value: 'tet' },
];

const locales = [
  'ar' as const,
  'en' as const,
  'es' as const,
  'fr' as const,
  'fr-DJ' as const,
  'ru' as const,
  'tet' as const,
  'ps' as const,
  'prs' as const,
  'pt' as const,
] as const;

const rtlLocales = ['ar', 'prs', 'ps'];

const pluralExceptions = ['each'];

export type SupportedLocales = (typeof locales)[number];
export const isRtlLocale = (locale: string) => rtlLocales.includes(locale);

type StringOrEmpty = string | null | undefined;

export const useIntlUtils = () => {
  const { i18n } = useIntl();
  const { language: i18nLanguage } = i18n;
  const t = useTranslation();

  const [language, setLanguage] = useState<string>(i18nLanguage);

  const changeLanguage = useCallback(
    (languageCode?: string) => {
      if (!languageCode) return;
      if (!locales.some(locale => languageCode === locale)) return;

      i18n.changeLanguage(languageCode);
      setLanguage(languageCode);
    },
    [i18n]
  );

  const isRtl = rtlLocales.includes(language);

  const currentLanguage = (() => {
    const supportedLanguage = language as SupportedLocales;
    if (locales.includes(supportedLanguage)) {
      return supportedLanguage;
    }

    // Handle languages such as en-US or fr-FR
    const baseLanguage = supportedLanguage?.split('-')[0] as SupportedLocales;
    if (locales.includes(baseLanguage)) {
      return baseLanguage;
    }

    if (!EnvUtils.isProduction() && !!language) {
      throw new Error(`Language '${language}' not supported`);
    }
    return 'en';
  })();

  const currentLanguageName = languageOptions.find(
    option => option.value === language
  )?.label;

  const getLocalisedFullName = useCallback(
    (firstName: StringOrEmpty, lastName: StringOrEmpty) =>
      getFullName(language, firstName, lastName),
    [language]
  );

  const getPlural = (word: string, count: number) => {
    // pluralize only works for English words. Any other language strings are returned unchanged
    if (language !== 'en') return word;

    // pick up any known failures in the pluralization library and return the original word in that case
    if (pluralExceptions.includes(word.toLowerCase())) return word;

    return pluralize(word, count);
  };

  // For mapping server errors. The locale strings probably won't contain an
  // exhaustive list of all possible errors, so just return a sentence-case
  // version of the server message if not defined
  const translateServerError = (serverKey: string) => {
    const localeKey = `server-error.${serverKey}` as LocaleKey;
    return t(localeKey, Formatter.fromCamelCase(serverKey));
  };



  const invalidateCustomTranslations = () => {
    // Clear from local storage cache
    Object.keys(localStorage)
      .filter(
        key =>
          key.startsWith('i18next_res_') &&
          key.endsWith(CUSTOM_TRANSLATIONS_NAMESPACE)
      )
      .forEach(key => localStorage.removeItem(key));

    // Clear from i18next cache (specifically for when we delete a translation)
    for (const lang of i18n.languages) {
      i18n.removeResourceBundle(lang, CUSTOM_TRANSLATIONS_NAMESPACE);
    }

    // Then reload from backend
    // Note - this is still requires the components in question to
    // re-render to pick up the new translations
    i18n.reloadResources(undefined, CUSTOM_TRANSLATIONS_NAMESPACE);
  };

  return {
    currentLanguage,
    currentLanguageName,
    isRtl,
    languageOptions,
    changeLanguage,
    getLocaleCode,
    getLocale: () => getLocale(currentLanguage),
    getUserLocale,
    setUserLocale,
    getLocalisedFullName,
    getPlural,
    translateServerError,
    invalidateCustomTranslations,
  };
};

const getLocaleCode = (language: LanguageTypeNode) => parseLanguage(language);

const getUserLocale = (username: string) => {
  const locales = LocalStorage.getItem('/localisation/locale');
  return !!locales ? locales[username] : undefined;
};

const setUserLocale = (username: string, locale: SupportedLocales) => {
  const locales = LocalStorage.getItem('/localisation/locale') ?? {};
  locales[username] = locale;
  LocalStorage.setItem('/localisation/locale', locales);
};

const parseLanguage = (language?: string) => {
  switch (language) {
    case LanguageTypeNode.English:
      return 'en';
    case LanguageTypeNode.French:
      return 'fr';
    case LanguageTypeNode.Khmer:
      return 'kh';
    case LanguageTypeNode.Laos:
      return 'la';
    case LanguageTypeNode.Portuguese:
      return 'pt';
    case LanguageTypeNode.Russian:
      return 'ru';
    case LanguageTypeNode.Spanish:
      return 'es';
    case LanguageTypeNode.Tetum:
      return 'tet';
    default:
      return undefined;
  }
};

/** Function to return a person's full name formatted for the current locale.
 * Default will just be "{{firstName}} {{lastName}}" */
const getFullName = (
  language: string,
  firstName: StringOrEmpty,
  lastName: StringOrEmpty
): string => {
  switch (language) {
    // Add cases as required, for now all supported languages use the same format
    default:
      return `${firstName ?? ''} ${lastName ?? ''}`.trim();
  }
};
