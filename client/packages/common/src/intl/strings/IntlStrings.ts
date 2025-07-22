import { useCallback } from 'react';
import { TOptions } from 'i18next';
import { useTranslation as useTranslationNext } from 'react-i18next';
import { LocaleKey } from '../locales';
import { useIntl } from '../utils';
import { CUSTOM_TRANSLATIONS_NAMESPACE } from '../context';

export { UseTranslationResponse } from 'react-i18next';

export interface TypedTFunction<Keys> {
  // basic usage
  (key: Keys, options?: TOptions<Record<string, unknown>> | string): string;
}

export const useTranslation = (
  namespace: string = CUSTOM_TRANSLATIONS_NAMESPACE
): TypedTFunction<LocaleKey> => {
  const { i18n } = useIntl();
  // Use custom namespace to apply Global Preference translation overrides.
  // Otherwise defaults to values in "common.json"
  const { t } = useTranslationNext(namespace, { i18n });

  return useCallback(
    (key, opts) => {
      const defaultValue = typeof opts === 'string' ? opts : undefined;
      const options =
        typeof opts === 'object'
          ? { ...opts, returnDetails: false }
          : { returnDetails: false, defaultValue };

      return key && i18n.exists(key, options)
        ? t(key, options)
        : String(defaultValue || options?.defaultValue || key || '');
    },
    [t]
  );
};

export const useTranslationExistsInLocale = (key: string): boolean => {
  const { i18n } = useIntl();
  return i18n.exists(key);
};
