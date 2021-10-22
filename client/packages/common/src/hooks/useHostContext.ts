import create from 'zustand';
import { LocalStorage } from '../localStorage';

import { SupportedLocales } from '../intl/intlHelpers';
import { Store, User } from '../types';

type HostContext = {
  setAppSessionDetailsRef: (ref: React.MutableRefObject<null> | null) => void;
  appSessionDetailsRef: React.MutableRefObject<null> | null;

  setAppFooterRef: (ref: React.MutableRefObject<null> | null) => void;
  appFooterRef: React.MutableRefObject<null> | null;

  setAppBarContentRef: (ref: React.MutableRefObject<null> | null) => void;
  appBarContentRef: React.MutableRefObject<null> | null;

  setAppBarButtonsRef: (ref: React.MutableRefObject<null> | null) => void;
  appBarButtonsRef: React.MutableRefObject<null> | null;

  setDetailPanelRef: (ref: React.MutableRefObject<null> | null) => void;
  detailPanelRef: React.MutableRefObject<null> | null;

  setLocale: (locale: SupportedLocales) => void;
  locale: SupportedLocales;

  setStore: (store: Store) => void;
  store: Store;

  setUser: (user: User) => void;
  user: User;
};

export const useHostContext = create<HostContext>(set => ({
  setAppSessionDetailsRef: (refOrNull: React.MutableRefObject<null> | null) =>
    set(state => ({ ...state, appSessionDetailsRef: refOrNull })),
  appSessionDetailsRef: null,

  setAppFooterRef: (refOrNull: React.MutableRefObject<null> | null) =>
    set(state => ({ ...state, appFooterRef: refOrNull })),
  appFooterRef: null,

  setAppBarContentRef: (refOrNull: React.MutableRefObject<null> | null) =>
    set(state => ({ ...state, appBarContentRef: refOrNull })),
  appBarContentRef: null,

  setAppBarButtonsRef: (refOrNull: React.MutableRefObject<null> | null) =>
    set(state => ({ ...state, appBarButtonsRef: refOrNull })),
  appBarButtonsRef: null,

  setDetailPanelRef: (refOrNull: React.MutableRefObject<null> | null) =>
    set(state => ({ ...state, detailPanelRef: refOrNull })),
  detailPanelRef: null,

  setLocale: locale => set(state => ({ ...state, locale })),
  locale: LocalStorage.getItem('/localisation/locale') ?? 'en',

  setStore: store => set(state => ({ ...state, store })),
  store: { id: '4321dcba', name: 'Central Warehouse' },

  setUser: user => set(state => ({ ...state, user })),
  user: { id: 'abcd1234', name: 'Administrator' },
}));

useHostContext.subscribe(({ locale }) => {
  LocalStorage.setItem('/localisation/locale', locale);
});

LocalStorage.addListener<SupportedLocales>((key, value) => {
  if (key === '/localisation/locale') {
    useHostContext.setState(state => ({ ...state, locale: value }));
  }
});
