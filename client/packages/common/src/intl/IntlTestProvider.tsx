import React, { FC } from 'react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { SupportedLocales } from './intlHelpers';
import { resources as defaultResources } from './locales';
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
    ...defaultResources,
    ar: {
      app: { ...defaultResources.en.common, ...appAr },
      common: { ...defaultResources.en.common, ...commonAr },
    },
    fr: {
      app: { ...defaultResources.en.app, ...appFr },
      common: { ...defaultResources.en.common, ...commonFr },
    },
  };

  i18next.use(initReactI18next).init({
    resources,
    debug: true,
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
