import { createRef } from 'react';
import create from 'zustand';
import { LocalStorage } from '../localStorage';

import { SupportedLocales } from '../intl/intlHelpers';
import { Store, User } from '../types';

type HostContext = {
  setAppBarContentRef: (ref: React.MutableRefObject<null> | null) => void;
  appBarButtonsRef: React.MutableRefObject<null> | null;
  appBarContentRef: React.MutableRefObject<null> | null;
  locale: SupportedLocales;
  setLocale: (locale: SupportedLocales) => void;
  setStore: (store: Store) => void;
  store: Store;
  setUser: (user: User) => void;
  user: User;
};

export const useHostContext = create<HostContext>(set => ({
  setAppBarContentRef: (refOrNull: React.MutableRefObject<null> | null) =>
    set(state => ({ ...state, appBarContentRef: refOrNull })),
  locale: LocalStorage.getItem('/localisation/locale') ?? 'en',
  appBarButtonsRef: createRef(),
  appBarContentRef: null,
  store: { id: '4321dcba', name: 'Central Warehouse' },
  user: { id: 'abcd1234', name: 'Administrator' },
  setLocale: locale => set(state => ({ ...state, locale })),
  setUser: user => set(state => ({ ...state, user })),
  setStore: store => set(state => ({ ...state, store })),
}));

useHostContext.subscribe(({ locale }) => {
  LocalStorage.setItem('/localisation/locale', locale);
});

LocalStorage.addListener<SupportedLocales>((key, value) => {
  if (key === '/localisation/locale') {
    useHostContext.setState(state => ({ ...state, locale: value }));
  }
});
