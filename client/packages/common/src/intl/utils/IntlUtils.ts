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
import {
  frFR,
  ptPT,
  esES,
  ruRU,
  enUS as muiEnUS,
} from '@mui/x-date-pickers/locales';

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
import pluralize from 'pluralize';
import { localeKeySet } from '../locales';
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
    default:
      return getLocaleObj[language];
  }
};

const getLocalisations = (locale: typeof frFR) =>
  locale.components.MuiLocalizationProvider.defaultProps.localeText;

const getDateLocalisations = (language: SupportedLocales) => {
  switch (language) {
    case 'fr':
    case 'fr-DJ':
      return getLocalisations(frFR);

    case 'es':
      return getLocalisations(esES);

    case 'ru':
      return getLocalisations(ruRU);

    case 'pt':
      return getLocalisations(ptPT);

    // Not every language is supported by MUI, and some dialects may want
    // overrides. If/when needed - pass in t() here and set required fields,
    // or define full localeText object for the required language
    case 'en':
    case 'ar':
    case 'tet':
      return getLocalisations(muiEnUS);
    default:
      noOtherVariants(language);
  }
};

export const useIntl = () => useContext(IntlContext);

const languageOptions = [
  { label: 'عربي', value: 'ar' },
  { label: 'Français', value: 'fr' },
  { label: 'Français (Djibouti)', value: 'fr-DJ' },
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
  { label: 'Русский', value: 'ru' },
  { label: 'Tetum', value: 'tet' },
  { label: 'Português', value: 'pt' },
];

const locales = [
  'ar' as const,
  'en' as const,
  'es' as const,
  'fr' as const,
  'fr-DJ' as const,
  'ru' as const,
  'tet' as const,
  'pt' as const,
] as const;

const rtlLocales = ['ar'];

export type SupportedLocales = (typeof locales)[number];

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

  // pluralize only works for English words. Any other language strings are returned unchanged
  const getPlural = (word: string, count: number) => {
    if (language !== 'en') return word;
    return pluralize(word, count);
  };

  // For mapping server errors. The locale strings probably won't contain an
  // exhaustive list of all possible errors, so just return a sentence-case
  // version of the server message if not defined
  const translateServerError = (serverKey: string) => {
    const localeKey = `server-error.${serverKey}` as LocaleKey;
    return t(localeKey, Formatter.fromCamelCase(serverKey));
  };

  const translateDynamicKey = (key: string, fallback: string) => {
    return isLocaleKey(key) ? t(key) : fallback;
  };

  const isLocaleKey = (key: string): key is LocaleKey => {
    return localeKeySet.has(key);
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
    getDateLocalisations: () => getDateLocalisations(currentLanguage),
    getUserLocale,
    setUserLocale,
    getLocalisedFullName,
    getPlural,
    translateServerError,
    isLocaleKey,
    translateDynamicKey,
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
