import { i18n } from 'i18next';
import { useTranslation as useTranslationNext } from 'react-i18next';
import { EnvUtils } from '@common/utils';
import { LanguageType } from '../../types/schema';

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

export type SupportedLocales = typeof locales[number];

export const IntlUtils = {
  useChangeLanguage: () => {
    const { i18n } = useTranslationNext();
    return (language?: LanguageType) => {
      const userLanguage = parseLanguage(language);
      if (!userLanguage) return;
      if (!locales.some(locale => userLanguage === locale)) return;

      i18n.changeLanguage(userLanguage);
    };
  },
  useRtl: (): boolean => {
    const { i18n } = useTranslationNext();
    const { language } = i18n;
    const isRtl = language === 'ar';
    return isRtl;
  },
  useI18N: (): i18n => {
    const { i18n } = useTranslationNext();
    return i18n;
  },
  // TODO: When the server supports a query to find the deployments
  // default language, use a query to fetch it.
  useDefaultLanguage: (): SupportedLocales => {
    return 'en';
  },
  useCurrentLanguage: (): SupportedLocales => {
    const { i18n } = useTranslationNext();
    const { language } = i18n;
    const supportedLanguage = language as SupportedLocales;
    if (locales.includes(supportedLanguage)) {
      return supportedLanguage;
    }
    if (!EnvUtils.isProduction()) {
      throw new Error(`Language '${language}' not supported`);
    }
    return 'en';
  },
  languageOptions,
  getLanguageName: (language: string) =>
    languageOptions.find(option => option.value === language)?.label,
};

const parseLanguage = (language?: LanguageType) => {
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
