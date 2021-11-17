import { FormatNumberOptions, useIntl } from 'react-intl';
import type { PrimitiveType } from 'intl-messageformat';

// "import type" ensures en messages aren't bundled by default
import * as sourceOfTruth from './locales/en/common.json';
import { useHostContext } from '../hooks';

export type SupportedLocales = 'en' | 'fr' | 'ar';
export type LocaleMessages = typeof sourceOfTruth;
export type LocaleKey = keyof LocaleMessages;
export type LocaleProps = Record<string, PrimitiveType>;

export const useTranslation = (): ((
  id?: LocaleKey, // only accepts valid keys, not any string
  values?: LocaleProps
) => string) => {
  const intl = useIntl();
  return (id, values) =>
    id ? intl.formatMessage({ id: id as string }, values) : '';
};

export const useTranslationWithFallback = (): ((
  id: LocaleKey, // only accepts valid keys, not any string
  fallback: string,
  values?: Record<string, PrimitiveType>
) => string) => {
  const intl = useIntl();
  return (id, fallback, values) => {
    if (!id) return '';
    if (Object.keys(intl.messages).every(key => id !== key)) return fallback;
    return intl.formatMessage({ id: id as string }, values);
  };
};

export const useFormatDate = (): ((
  value: number | Date,
  options?: Intl.DateTimeFormatOptions & { format?: string }
) => string) => {
  const intl = useIntl();
  return (value, options) => intl.formatDate(value, options);
};
export const useFormatNumber = (): ((
  value: number | bigint,
  options?: FormatNumberOptions
) => string) => {
  const intl = useIntl();
  return (value, options) => intl.formatNumber(value, options);
};
export const useRtl = (): boolean => {
  const { locale } = useHostContext();
  const isRtl = locale === 'ar';
  return isRtl;
};

// return type on this signature enforces that all languages have the same translations defined
export const importMessages = (
  locale: SupportedLocales
): Promise<LocaleMessages> => {
  switch (locale) {
    case 'en':
      return import(
        /* webpackMode: "lazy", webpackChunkName: "en_json" */
        './locales/en/common.json'
      );
    case 'fr':
      return import(
        /* webpackMode: "lazy", webpackChunkName: "fr_json" */
        './locales/en/common.json'
      );
    case 'ar':
      return import(
        /* webpackMode: "lazy", webpackChunkName: "ab_json" */
        './locales/en/common.json'
      );
  }
};

// import { Namespace, useTranslation as useTranslationNext } from 'react-i18next';
// import { i18n, TFunctionResult, TOptions } from 'i18next';
// import { LocaleKey } from './locales';

// export type SupportedLocales = 'en' | 'fr' | 'ar';
// export type LocaleProps = TOptions<Record<string, unknown>> | string;
// export { LocaleKey };
// export interface TypedTFunction<Keys> {
//   // basic usage
//   <TKeys extends Keys, TResult extends TFunctionResult = string>(
//     key: TKeys | TKeys[],
//     options?: LocaleProps
//   ): TResult;
//   // overloaded usage
//   <TKeys extends Keys, TResult extends TFunctionResult = string>(
//     key: TKeys | TKeys[],
//     defaultValue?: string,
//     options?: LocaleProps
//   ): TResult;
// }

// export const useTranslation = (ns?: Namespace): TypedTFunction<LocaleKey> => {
//   const { t } = useTranslationNext(ns);
//   return (key, options) => (key ? t(key, options) : '');
// };

// export const useI18N = (): i18n => {
//   const { i18n } = useTranslationNext();
//   return i18n;
// };

// // export const useTranslationWithFallback = (): ((
// //   id: LocaleKey, // only accepts valid keys, not any string
// //   fallback: string,
// //   values?: Record<string, PrimitiveType>
// // ) => string) => {
// //   const intl = useIntl();
// //   return (id, fallback, values) => {
// //     if (!id) return '';
// //     if (Object.keys(intl.messages).every(key => id !== key)) return fallback;

// //     return intl.formatMessage({ id: id as string }, values);
// //   };
// // };

// export const useFormatDate = (): ((
//   value: number | Date,
//   options?: Intl.DateTimeFormatOptions & { format?: string }
// ) => string) => {
//   const { t } = useTranslationNext();
//   return (val, formatParams) => t('intl.datetime', { val, formatParams });
// };

// export const useFormatNumber = (): ((
//   value: number | bigint,
//   options?: Intl.NumberFormatOptions
// ) => string) => {
//   const { t } = useTranslationNext();
//   return (val, formatParams) => t('intl.number', { val, formatParams });
// };

// export const useRtl = (): boolean => {
//   const { i18n } = useTranslationNext();
//   const { language } = i18n;
//   const isRtl = language === 'ar';
//   return isRtl;
// };
