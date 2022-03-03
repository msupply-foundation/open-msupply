import React, { FC } from 'react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { SupportedLocales } from './intlHelpers';
import app from './locales/en/app.json';
import common from './locales/en/common.json';
import appFr from './locales/fr/app.json';
import commonFr from './locales/fr/common.json';
import appAr from './locales/ar/app.json';
import commonAr from './locales/ar/common.json';
interface IntlTestProviderProps {
  locale: SupportedLocales;
}

export const IntlTestProvider: FC<IntlTestProviderProps> = ({
  children,
  locale,
}) => {
  const resources = {
    ar: {
      app: { ...app, ...appAr },
      common: { ...common, ...commonAr },
    },
    en: { app, common },
    fr: {
      app: { ...app, ...appFr },
      common: { ...common, ...commonFr },
    },
  };

  // Suppressing i18next logging which pollutes the test output
  // with information about language changes etc.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // i18next.logger = { log: () => {} };

  i18next.use(initReactI18next).init({
    resources,
    debug: false,
    lng: locale,
    fallbackLng: 'en',
    ns: ['app', 'common'],
    defaultNS: 'common',
    fallbackNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  });

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
};
