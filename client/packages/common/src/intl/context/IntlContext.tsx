import React from 'react';
import i18next from 'i18next';
import Backend from 'i18next-chained-backend';
import LocalStorageBackend from 'i18next-localstorage-backend';
import HttpApi from 'i18next-http-backend';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const defaultNS = 'common';
export const IntlProvider = ({ children }: { children?: React.ReactNode }) => {
  React.useEffect(() => {
    const minuteInMilliseconds = 60 * 1000;
    const expirationTime =
      process.env['NODE_ENV'] === 'development'
        ? 0
        : // TODO: change back to a week when things are stable
          60 * minuteInMilliseconds; // 7 * 24 * 60 * minuteInMilliseconds;
    i18next
      .use(initReactI18next) // passes i18n down to react-i18next
      .use(Backend)
      .use(LanguageDetector)
      .init({
        backend: {
          backends: [
            LocalStorageBackend, // primary backend
            HttpApi, // fallback backend
          ],
          backendOptions: [
            {
              /* options for primary backend */
              expirationTime,
            },
            {
              /* options for secondary backend */
              loadPath: '/locales/{{lng}}/{{ns}}.json',
            },
          ],
        },
        debug: true,
        defaultNS,
        ns: defaultNS, // behaving as I expect defaultNS should. Without specifying ns here, a request is made to 'translation.json'
        fallbackLng: 'en',
        fallbackNS: 'common',
        load: 'languageOnly', // if requested language is 'en-US' then we load 'en'; change to the default value of 'all' to load 'en-US' and 'en'
        interpolation: {
          escapeValue: false, // not needed for react!!
        },
      });
  }, []);

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
};
