import { i18n } from 'i18next';
import { useTranslation as useTranslationNext } from 'react-i18next';
import { EnvUtils } from '@common/utils';

export { useTranslationNext };

const locales = ['en' as const, 'ar' as const, 'fr' as const] as const;

export type SupportedLocales = typeof locales[number];

export const useRtl = (): boolean => {
  const { i18n } = useTranslationNext();
  const { language } = i18n;
  const isRtl = language === 'ar';
  return isRtl;
};

export const useI18N = (): i18n => {
  const { i18n } = useTranslationNext();
  return i18n;
};

// TODO: When the server supports a query to find the deployments
// default language, use a query to fetch it.
export const useDefaultLanguage = (): SupportedLocales => {
  return 'en';
};

export const isSupportedLang = (lang: string): lang is SupportedLocales =>
  locales.some(locale => lang === locale);

export const useCurrentLanguage = (): SupportedLocales => {
  const { i18n } = useTranslationNext();
  const { language } = i18n;
  if (language === 'en' || language === 'fr' || language === 'ar') {
    return language;
  }
  if (!EnvUtils.isProduction()) {
    throw new Error(`Language '${language}' not supported`);
  }
  return 'en';
};
