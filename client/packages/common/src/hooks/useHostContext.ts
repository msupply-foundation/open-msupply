import create from 'zustand';
import { getAuthCookie } from './useAuthContext';
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

  setStore: (store: Store) => void;
  store: Store;

  setUser: (user: User) => void;
  user: User;
};

const authCookie = getAuthCookie();
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

  setStore: store => set(state => ({ ...state, store })),
  store: authCookie.store ?? { id: '', code: '' },

  setUser: user => set(state => ({ ...state, user })),
  user: authCookie.user ?? { id: '', name: '' },
}));
