import React, { PropsWithChildren } from 'react';
import i18next from 'i18next';
import Backend from 'i18next-chained-backend';
import LocalStorageBackend from 'i18next-localstorage-backend';
import HttpApi from 'i18next-http-backend';
import { I18nextProviderProps, initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { browserLanguageDetector } from './browserLanguageDetector';
import { createRegisteredContext } from 'react-singleton-context';
const appVersion = require('../../../../../../package.json').version; // eslint-disable-line @typescript-eslint/no-var-requires

// Created by webpack DefinePlugin see webpack.config.js
// Only for web, otherwise default to app version
declare const LANG_VERSION: string;

const defaultNS = 'common';
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

  // Electron `main` window translations should be served with relative path
  const loadPath = `${!!isElectron ? '.' : ''}/locales/{{lng}}/{{ns}}.json`;

  i18next
    .use(initReactI18next) // passes i18n down to react-i18next
    .use(Backend)
    .use(languageDetector)
    .init({
      backend: {
        backends: [
          LocalStorageBackend, // primary backend
          HttpApi, // fallback backend
        ],
        backendOptions: [
          {
            /* options for primary backend (local storage) */
            expirationTime,
            defaultVersion: languageVersion,
          },
          {
            /* options for secondary backend (http api request) */
            loadPath,
            queryStringParams: {
              v: languageVersion,
            },
          },
        ],
      },
      debug: isDevelopment,
      defaultNS,
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

      ns: defaultNS, // behaving as I expect defaultNS should. Without specifying ns here, a request is made to 'translation.json'
      fallbackLng: 'en',
      fallbackNS: 'common',
      // the following option was used to assist the browser language detection; but it prevents regional variations, so has been removed
      // load: 'languageOnly', // if requested language is 'en-US' then we load 'en'; change to the default value of 'all' to load 'en-US' and 'en'
      interpolation: {
        escapeValue: false, // not needed for react!!
      },
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
