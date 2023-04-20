import { useTranslation as useTranslationNext } from 'react-i18next';
import { EnvUtils } from '@common/utils';
import { LanguageType } from '../../types/schema';
import { LocalStorage } from '../../localStorage';

export { useTranslationNext };

const languageOptions = [
  { label: 'عربي', value: 'ar' },
  { label: 'Français', value: 'fr' },
  { label: 'English', value: 'en' },
  { label: 'Española', value: 'es' },
  { label: 'Tetum', value: 'tet' },
];

const locales = [
  'ar' as const,
  'en' as const,
  'es' as const,
  'fr' as const,
  'tet' as const,
] as const;

const rtlLocales = ['ar'];

export type SupportedLocales = (typeof locales)[number];
type StringOrEmpty = string | null | undefined;

export const useIntlUtils = () => {
  const { i18n } = useTranslationNext();
  const { language } = i18n;

  const changeLanguage = (languageCode?: string) => {
    if (!languageCode) return;
    if (!locales.some(locale => languageCode === locale)) return;

    i18n.changeLanguage(languageCode);
  };

  const isRtl = rtlLocales.includes(language);

  const currentLanguage = (() => {
    const supportedLanguage = language as SupportedLocales;
    if (locales.includes(supportedLanguage)) {
      return supportedLanguage;
    }
    if (!EnvUtils.isProduction()) {
      throw new Error(`Language '${language}' not supported`);
    }
    return 'en';
  })();

  const currentLanguageName = languageOptions.find(
    option => option.value === language
  )?.label;

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

  const getLocalisedFullName = (
    firstName: StringOrEmpty,
    lastName: StringOrEmpty
  ) => getFullName(language, firstName, lastName);

  return {
    i18n,
    // TODO: When the server supports a query to find the deployments
    // default language, use a query to fetch it.
    defaultLanguage: 'en',
    isRtl,
    currentLanguage,
    languageOptions,
    currentLanguageName,
    changeLanguage,
    getLocaleCode,
    getUserLocale,
    setUserLocale,
    getLocalisedFullName,
  };
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
 * Default will just be "{{firstName}} {{lastName}}"*/
const getFullName = (
  language: string,
  firstName: StringOrEmpty,
  lastName: StringOrEmpty
): string => {
  switch (language) {
    // Add cases as required, for now all supported languages use the same
    // format
    default:
      return `${firstName ?? ''} ${lastName ?? ''}`.trim();
  }
};
