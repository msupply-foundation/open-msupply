import { useIntl } from 'react-intl';
import type { PrimitiveType } from 'intl-messageformat';

// "import type" ensures en messages aren't bundled by default
import * as sourceOfTruth from './locales/en.json';

// Note: in order to use "import type" you'll need Babel >= 7.9.0 and/or TypeScript >= 3.8.
// Otherwise, you can use a normal import and accept to always bundle one language + the user required one

export type SupportedLocales = 'en' | 'fr' | 'pt';
export type LocaleMessages = typeof sourceOfTruth;
export type LocaleKey = keyof LocaleMessages;

export const useFormatMessage = (): ((
  id: string, // LocaleKey, // only accepts valid keys, not any string
  values?: Record<string, PrimitiveType>
) => string) => {
  const intl = useIntl();
  return (id, values) => intl.formatMessage({ id: id as string }, values);
};

// return type on this signature enforces that all languages have the same translations defined
export const importMessages = (
  locale: SupportedLocales
  // ): Promise<LocaleMessages> => {
): Record<string, string> => {
  // : LocaleMessages => {
  switch (locale) {
    case 'en':
      return sourceOfTruth;
    //            return fetch(en).then(response => response.json());
    // return import(
    //     /* webpackMode: "lazy-once", webpackChunkName: "en_json" */
    //     './locales/en');
    // const en = require('./locales/en.json');
    // return new Promise(() => en);
    case 'fr':
      return sourceOfTruth; // require('./locales/fr.json');
    // return new Promise(() => fr);
    case 'pt':
      return sourceOfTruth;
    // return new Promise(() => pt);
  }
};
