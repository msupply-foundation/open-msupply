import { FormatNumberOptions, useIntl } from 'react-intl';
import type { PrimitiveType } from 'intl-messageformat';
import { Namespace, useTranslation as useTranslationNext } from 'react-i18next';
import { TFunctionResult, TOptions } from 'i18next';

// "import type" ensures en messages aren't bundled by default
import * as sourceOfTruth from './locales/en/common.json';
import { useHostContext } from '../hooks';

export type SupportedLocales = 'en' | 'fr' | 'ar';
export type LocaleMessages = typeof sourceOfTruth;
export type LocaleKey = keyof LocaleMessages;
export type LocaleProps = Record<string, PrimitiveType>;

// export type LocaleProps = TOptions<Record<string, unknown>> | string;
// export { LocaleKey };
export interface TypedTFunction<Keys> {
  // basic usage
  <TKeys extends Keys, TResult extends TFunctionResult = string>(
    key: TKeys | TKeys[],
    options?: TOptions<Record<string, unknown>> | string
  ): TResult;
  // overloaded usage
  <TKeys extends Keys, TResult extends TFunctionResult = string>(
    key: TKeys | TKeys[],
    defaultValue?: string,
    options?: TOptions<Record<string, unknown>> | string
  ): TResult;
}

export const useTranslation = (ns?: Namespace): TypedTFunction<LocaleKey> => {
  const { t } = useTranslationNext(ns);
  return (key, options) => (key ? t(key, options) : '');
};

const useRtlPrevious = (): boolean => {
  const { locale } = useHostContext();
  const isRtl = locale === 'ar';
  return isRtl;
};

export const useFormatDate = (): ((
  value: number | Date,
  options?: Intl.DateTimeFormatOptions & { format?: string }
) => string) => {
  const { t } = useTranslationNext();
  return (val, formatParams) => t('intl.datetime', { val, formatParams });
};

export const useFormatNumber = (): ((
  value: number | bigint,
  options?: Intl.NumberFormatOptions
) => string) => {
  const { t } = useTranslationNext();
  return (val, formatParams) => t('intl.number', { val, formatParams });
};

export const useRtl = (): boolean => {
  const { i18n } = useTranslationNext();
  const { language } = i18n;
  const isRtl = language === 'ar';
  return isRtl;
};
