import { useCallback } from 'react';
import { TOptions } from 'i18next';
import { useTranslation as useTranslationNext } from 'react-i18next';
import { LocaleKey } from '../locales';
import { useIntl } from '../utils';

export { UseTranslationResponse } from 'react-i18next';

export interface TypedTFunction<Keys> {
  // basic usage
  (key: Keys, options?: TOptions<Record<string, unknown>>): string;
}

// export { useTranslation };
// ns:
//   * Defaults to "common".
//   * If not "common" will use ns that's specified first then "common" if local key not matched
//   * Can parse array but only first element is used TODO fix
//
// returned function can be used with optional ns, i.e. t('label.create-user', { ns: 'system' })
export const useTranslation = (): TypedTFunction<LocaleKey> => {
  const { i18n } = useIntl();
  // use default common namespace by passing undefined
  const { t } = useTranslationNext(undefined, { i18n });

  return useCallback(
    (key, opts) => {
      const defaultValue = typeof opts === 'string' ? opts : undefined;
      const options =
        typeof opts === 'object'
          ? { ...opts, returnDetails: false }
          : { returnDetails: false, defaultValue };

      return key
        ? t(key, options)
        : String(defaultValue || opts?.defaultValue || '');
    },
    [t]
  );
};
