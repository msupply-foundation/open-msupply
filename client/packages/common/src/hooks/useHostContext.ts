import { createRef } from 'react';
import create from 'zustand';
import { LocalStorage } from '../localStorage';

import { SupportedLocales } from '../intl/intlHelpers';

type HostContext = {
  setAppBarContentRef: (ref: React.MutableRefObject<null> | null) => void;
  appBarButtonsRef: React.MutableRefObject<null> | null;
  appBarContentRef: React.MutableRefObject<null> | null;
  locale: SupportedLocales;
  setLocale: (locale: SupportedLocales) => void;
};

export const useHostContext = create<HostContext>(set => ({
  setAppBarContentRef: (refOrNull: React.MutableRefObject<null> | null) =>
    set(state => ({ ...state, appBarContentRef: refOrNull })),
  locale: LocalStorage.getItem('/localisation/locale') ?? 'en',
  appBarButtonsRef: createRef(),
  appBarContentRef: null,
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
