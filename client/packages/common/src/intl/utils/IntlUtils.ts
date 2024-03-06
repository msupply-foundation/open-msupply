import React, { useCallback } from 'react';
import { EnvUtils } from '@common/utils';
import { LanguageType } from '../../types/schema';
import { LocalStorage } from '../../localStorage';
import { IntlContext } from '../context';

// importing individually to reduce bundle size
// the date-fns methods are tree shaking correctly
// but the locales are not. when adding, please add as below
import enGB from 'date-fns/locale/en-GB';
import enUS from 'date-fns/locale/en-US';
import fr from 'date-fns/locale/fr';
import ar from 'date-fns/locale/ar';
import es from 'date-fns/locale/es';
import ru from 'date-fns/locale/ru';

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
    default:
      return getLocaleObj[language];
  }
};

export const useIntl = () => React.useContext(IntlContext);

const languageOptions = [
  { label: 'عربي', value: 'ar' },
  { label: 'Français', value: 'fr' },
  { label: 'Français (Djibouti)', value: 'fr-DJ' },
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
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
] as const;

const rtlLocales = ['ar'];

export type SupportedLocales = (typeof locales)[number];

type StringOrEmpty = string | null | undefined;

export const useIntlUtils = () => {
  const { i18n } = useIntl();
  const { language: i18nLanguage } = i18n;
  const [language, setLanguage] = React.useState<string>(i18nLanguage);

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
  };
};

const getLocaleCode = (language: LanguageType) => parseLanguage(language);

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
    case LanguageType.English:
      return 'en';
    case LanguageType.French:
      return 'fr';
    case LanguageType.Khmer:
      return 'kh';
    case LanguageType.Laos:
      return 'la';
    case LanguageType.Portuguese:
      return 'pt';
    case LanguageType.Russian:
      return 'ru';
    case LanguageType.Spanish:
      return 'es';
    case LanguageType.Tetum:
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
