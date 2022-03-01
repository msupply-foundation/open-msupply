import { isProduction } from './../utils/index';
import { Namespace, useTranslation as useTranslationNext } from 'react-i18next';
import { i18n, TOptions } from 'i18next';
import { useHostContext } from '../hooks';
import { LocaleKey } from './locales';
import currency from 'currency.js';

export type SupportedLocales = 'en' | 'fr' | 'ar';
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

export const useTranslation = (ns?: Namespace): TypedTFunction<LocaleKey> => {
  const { t } = useTranslationNext(ns);
  return (key, options) => (key ? t(key, options) : '');
};

const currencyOptions = {
  en: {
    symbol: '$',
    separator: ',',
    decimal: '.',
    precision: 2,
    pattern: '!#',
    negativePattern: '-!#',
  },
  fr: {
    symbol: 'XOF',
    separator: '.',
    decimal: ',',
    precision: 2,
    pattern: '# !',
    negativePattern: '-# !',
  },
  ar: {
    symbol: 'ر.ق.',
    separator: ',',
    decimal: '.',
    precision: 2,
    pattern: '!#',
    negativePattern: '-!#',
  },
};

export const useCurrentLanguage = (): SupportedLocales => {
  const { i18n } = useTranslationNext();
  const { language } = i18n;

  if (language === 'en' || language === 'fr' || language === 'ar') {
    return language;
  }

  if (!isProduction()) {
    throw new Error(`Language '${language}' not supported`);
  }

  return 'en';
};

export const useCurrency = () => {
  const language = useCurrentLanguage();
  const options = currencyOptions[language];
  return {
    c: (value: currency.Any) => currency(value, options),
    options,
    language,
  };
};

export const useCurrencyFormat = (value: currency.Any) => {
  const { c } = useCurrency();
  return c(value).format();
};

export const useFormatDate = (): ((
  value: number | Date,
  options?: Intl.DateTimeFormatOptions & { format?: string }
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
  const { user } = useHostContext();
  return user?.name;
};
