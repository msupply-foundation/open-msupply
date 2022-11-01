import { useCallback } from 'react';
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

// ns:
//   * Defaults to "common".
//   * If not "common" will use ns that's specified first then "common" if local key not matched
//   * Can parse array but only first element is used TODO fix
//
// returned function can be used with optional ns, i.e. t('label.create-user', { ns: 'system' })
export const useTranslation = (ns?: Namespace): TypedTFunction<LocaleKey> => {
  const { t } = useTranslationNext(ns);
  return useCallback((key, options) => (key ? t(key, options) : ''), [t]);
};
