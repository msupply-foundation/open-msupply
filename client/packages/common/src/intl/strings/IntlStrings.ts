import { Namespace, useTranslation as useTranslationNext } from 'react-i18next';
import { TOptions } from 'i18next';
import { LocaleKey } from '../locales';

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
