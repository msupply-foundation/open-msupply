import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

// Single namespace for now. Add a language by dropping in another locale JSON
// with the same shape and registering it under `resources`.
export const defaultNS = 'common';
export const resources = { en: { common: en } } as const;

void i18next.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS,
  resources,
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

export default i18next;
