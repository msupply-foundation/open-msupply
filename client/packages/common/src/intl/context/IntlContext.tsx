import React, { PropsWithChildren } from 'react';
import i18next from 'i18next';
import Backend from 'i18next-chained-backend';
import LocalStorageBackend from 'i18next-localstorage-backend';
import { I18nextProviderProps, initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { browserLanguageDetector } from './browserLanguageDetector';
import { createRegisteredContext } from 'react-singleton-context';
import { Environment } from '@openmsupply-client/config';
import { GetBackendByNamespace } from './GetBackendByNamespace';
import { intlNumberFormat } from '../number/IntlNumber';
const appVersion = require('../../../../../../package.json').version; // eslint-disable-line @typescript-eslint/no-var-requires

// Created by webpack DefinePlugin see webpack.config.js
// Only for web, otherwise default to app version
declare const LANG_VERSION: string;

export const CUSTOM_TRANSLATIONS_NAMESPACE = 'custom-translations';
export const DEFAULT_TRANSLATIONS_NAMESPACE = 'common';
export const DESKTOP_TRANSLATIONS_NAMESPACE = 'desktop';
const minuteInMilliseconds = 60 * 1000;
const isDevelopment = process.env['NODE_ENV'] === 'development';

const expirationTime = isDevelopment ? 0 : 7 * 24 * 60 * minuteInMilliseconds; // Cache for 7 days, on rebuild we should get a new language version so we can use a reasonably long cache

const languageVersion =
  typeof LANG_VERSION === 'undefined' ? appVersion : LANG_VERSION;

/** Must be initialised outside of react */
export function initialiseI18n({
  isElectron = false,
}: {
  isElectron?: boolean;
} = {}) {
  const languageDetector = new LanguageDetector();
  languageDetector.addDetector(browserLanguageDetector);

  // Served with frontend bundle
  // Electron `main` window translations should be served with relative path
  // for electron, the preloaded script path is `file://:` we don't get a valid API_HOST url until we connect to the server and re-initialise the window
  // For web the locales live under the build-time base path (Environment.PUBLIC_PATH,
  // '/' by default, '/old-ui/' for the sub-path build) so they resolve alongside the bundle.
  const localesBase = isElectron ? './' : Environment.PUBLIC_PATH;
  const defaultTranslationsLoadPath = `${localesBase}locales/{{lng}}/{{ns}}.json`;

  // Served from backend, on electron we use a dummy but valid url https://localhost:8000 which shouldn't actually be used.
  // The `lng` query param lets the backend return language-specific custom
  // translations (v2). Older servers ignore the param and return the flat v1 map.
  const customTranslationsLoadPath = `${Environment.API_HOST.startsWith('file://') ? 'http://localhost:8000' : Environment.API_HOST}/custom-translations?lng={{lng}}`;

  i18next
    .use(initReactI18next) // passes i18n down to react-i18next
    .use(Backend)
    .use(languageDetector)
    .init({
      backend: {
        backends: [
          LocalStorageBackend, // primary backend
          GetBackendByNamespace, // when nothing in local storage, or cache invalid, query API for translations
        ],
        backendOptions: [
          {
            /* options for primary backend (local storage) */
            expirationTime,
            defaultVersion: languageVersion,
          },
          {
            languageVersion,
            endpointByNamespace: {
              [DEFAULT_TRANSLATIONS_NAMESPACE]: defaultTranslationsLoadPath,
              [DESKTOP_TRANSLATIONS_NAMESPACE]: defaultTranslationsLoadPath,
              [CUSTOM_TRANSLATIONS_NAMESPACE]: customTranslationsLoadPath,
            },
          },
        ],
      },
      debug: isDevelopment,
      detection: {
        order: [
          'querystring',
          'cookie',
          'localStorage',
          'sessionStorage',
          'omsBrowserLanguageDetector',
          'htmlTag',
        ],
      },
      defaultNS: CUSTOM_TRANSLATIONS_NAMESPACE,
      ns: [CUSTOM_TRANSLATIONS_NAMESPACE, DEFAULT_TRANSLATIONS_NAMESPACE],
      fallbackNS: DEFAULT_TRANSLATIONS_NAMESPACE,
      fallbackLng: 'en',
      // the following option was used to assist the browser language detection; but it prevents regional variations, so has been removed
      // load: 'languageOnly', // if requested language is 'en-US' then we load 'en'; change to the default value of 'all' to load 'en-US' and 'en'
      interpolation: {
        escapeValue: false, // not needed for react!!
      },
    });

  // i18next's built-in `number` formatter uses `Intl.NumberFormat(lng)` directly,
  // which ignores our numbering-system overrides (see localeNumberOverrides —
  // e.g. Pashto otherwise defaults to Latin digits). Route `{{x, number}}`
  // through `intlNumberFormat` so interpolated counts render in
  // locale-appropriate digits (Arabic-Indic ٠-٩ for ar; extended-Arabic ۰-۹ for
  // prs/ps). Fall back to the active language rather than 'en' if i18next
  // doesn't supply one, and leave non-numeric values untouched instead of
  // emitting "NaN".
  i18next.services.formatter?.add('number', (value, lng, options) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return value == null ? '' : String(value);
    return intlNumberFormat(lng ?? i18next.language, options).format(num);
  });
}

export const IntlContext = createRegisteredContext<I18nextProviderProps>(
  'i18nextProvider',
  { i18n: i18next }
);

export const IntlProvider = ({ children }: PropsWithChildren) => {
  return (
    <IntlContext.Provider value={{ i18n: i18next }}>
      {children}
    </IntlContext.Provider>
  );
};
