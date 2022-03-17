import { EnvUtils } from '@common/utils';
import { Namespace, useTranslation as useTranslationNext } from 'react-i18next';
import { i18n, TOptions } from 'i18next';
import { LocaleKey } from './locales';
import { useAuthContext } from '../authentication';

const locales = ['en' as const, 'ar' as const, 'fr' as const] as const;

export type SupportedLocales = typeof locales[number];

export type LocaleProps = Record<string, unknown>;
export interface TypedTFunction<Keys> {
  // basic usage
  (
    key?: Keys | Keys[],
    options?: TOptions<Record<string, unknown>> | string
  ): string;
  // overloaded usage
  (
    key?: Keys | Keys[],
    defaultValue?: string,
    options?: TOptions<Record<string, unknown>> | string
  ): string;
}

export const isSupportedLang = (lang: string): lang is SupportedLocales =>
  locales.some(locale => lang === locale);

export const useTranslation = (ns?: Namespace): TypedTFunction<LocaleKey> => {
  const { t } = useTranslationNext(ns);
  return (key, options) => (key ? t(key, options) : '');
};

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

export const useFormatDate = (): ((
  value: number | Date,
  options?: Intl.DateTimeFormatOptions & { format?: string } & {
    val: { month?: string; day?: string; year?: string; weekday?: string };
  }
) => string) => {
  const { t } = useTranslationNext('app');
  return (val, formatParams) => t('intl.datetime', { val, formatParams });
};

export const useFormatNumber = (): ((
  value: number | bigint,
  options?: Intl.NumberFormatOptions
) => string) => {
  const { t } = useTranslationNext('app');
  return (val, formatParams) => t('intl.number', { val, formatParams });
};

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

/* removing this unused method breaks things */
export const useUserName = (): string => {
  const { user } = useAuthContext();
  return user?.name ?? '';
};

// TODO: When the server supports a query to find the deployments
// default language, use a query to fetch it.
export const useDefaultLanguage = (): SupportedLocales => {
  return 'en';
};
