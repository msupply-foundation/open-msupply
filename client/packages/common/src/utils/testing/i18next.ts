import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import app from '@common/intl/locales/en/app.json';
import common from '@common/intl/locales/en/common.json';
import appFr from '@common/intl/locales/fr/app.json';
import commonFr from '@common/intl/locales/fr/common.json';
import appAr from '@common/intl/locales/ar/app.json';
import commonAr from '@common/intl/locales/ar/common.json';

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

i18next.use(initReactI18next).init({
  resources,
  debug: false,
  lng: 'en',
  fallbackLng: 'en',
  ns: ['app', 'common'],
  defaultNS: 'common',
  fallbackNS: 'common',
  interpolation: {
    escapeValue: false,
  },
  react: { useSuspense: false },
});

export default i18next;
