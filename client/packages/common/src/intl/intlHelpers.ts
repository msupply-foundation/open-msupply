import { useIntl } from 'react-intl';
import type { PrimitiveType } from 'intl-messageformat';

// "import type" ensures en messages aren't bundled by default
import * as sourceOfTruth from './locales/en.json';

export type SupportedLocales = 'en' | 'fr' | 'pt' | 'ab';
export type LocaleMessages = typeof sourceOfTruth;
export type LocaleKey = keyof LocaleMessages;

export const useTranslation = (): ((
  id?: LocaleKey, // only accepts valid keys, not any string
  values?: Record<string, PrimitiveType>
) => string) => {
  const intl = useIntl();
  return (id, values) =>
    id ? intl.formatMessage({ id: id as string }, values) : '';
};

export const useFormatDate = (): ((
  value: number | Date,
  options?: Intl.DateTimeFormatOptions & { format?: string }
) => string) => {
  const intl = useIntl();
  return (value, options) => intl.formatDate(value, options);
};

// return type on this signature enforces that all languages have the same translations defined
export const importMessages = (
  locale: SupportedLocales
): Promise<LocaleMessages> => {
  switch (locale) {
    case 'en':
      return import(
        /* webpackMode: "lazy", webpackChunkName: "en_json" */
        './locales/en.json'
      );
    case 'fr':
      return import(
        /* webpackMode: "lazy", webpackChunkName: "fr_json" */
        './locales/fr.json'
      );
    case 'pt':
      return import(
        /* webpackMode: "lazy", webpackChunkName: "pt_json" */
        './locales/pt.json'
      );
    case 'ab':
      return import(
        /* webpackMode: "lazy", webpackChunkName: "ab_json" */
        './locales/ab.json'
      );
  }
};
