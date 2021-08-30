import create from 'zustand';
import { LocalStorage } from '../localStorage';

import { SupportedLocales } from '../intl/intlHelpers';

type HostContext = {
  locale: SupportedLocales;
  setLocale: (locale: SupportedLocales) => void;
};

export const useHostContext = create<HostContext>(set => ({
  locale: LocalStorage.getItem('/localisation/locale') ?? 'en',
  setLocale: locale => set(state => ({ ...state, locale })),
}));

useHostContext.subscribe(({ locale }) => {
  localStorage.setItem('/localisation/locale', locale);
});

LocalStorage.addListener<SupportedLocales>((key, value) => {
  if (key === '/localisation/locale') {
    useHostContext.setState(state => ({ ...state, locale: value }));
  }
});
