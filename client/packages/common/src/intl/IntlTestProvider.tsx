import React, { FC } from 'react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { SupportedLocales } from './intlHelpers';
import { resources as defaultResources } from './locales';
import * as app from './locales/fr/app.json';
import * as common from './locales/fr/common.json';
interface IntlTestProviderProps {
  locale: SupportedLocales;
}

export const IntlTestProvider: FC<IntlTestProviderProps> = ({
  children,
  locale,
}) => {
  const resources = {
    ...defaultResources,
    fr: {
      app: { ...defaultResources.en.app, ...app },
      common: { ...defaultResources.en.common, ...common },
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
