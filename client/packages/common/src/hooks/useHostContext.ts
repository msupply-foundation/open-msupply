import { createRef } from 'react';
import create from 'zustand';
import { LocalStorage } from '../localStorage';

import { SupportedLocales } from '../intl/intlHelpers';

type HostContext = {
  appBarButtonsRef: React.MutableRefObject<null>;
  appBarExtraRef: React.MutableRefObject<null>;
  locale: SupportedLocales;
  setLocale: (locale: SupportedLocales) => void;
};

export const useHostContext = create<HostContext>(set => ({
  locale: LocalStorage.getItem('/localisation/locale') ?? 'en',
  appBarButtonsRef: createRef(),
  appBarExtraRef: createRef(),
  setLocale: locale => set(state => ({ ...state, locale })),
}));

useHostContext.subscribe(({ locale }) => {
  LocalStorage.setItem('/localisation/locale', locale);
});

LocalStorage.addListener<SupportedLocales>((key, value) => {
  if (key === '/localisation/locale') {
    useHostContext.setState(state => ({ ...state, locale: value }));
  }
});
