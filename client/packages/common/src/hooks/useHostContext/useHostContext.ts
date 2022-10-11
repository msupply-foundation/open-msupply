import create from 'zustand';

type HostContext = {
  setAppSessionDetailsRef: (ref: React.MutableRefObject<null> | null) => void;
  appSessionDetailsRef: React.MutableRefObject<null> | null;

  setAppFooterRef: (ref: React.MutableRefObject<null> | null) => void;
  appFooterRef: React.MutableRefObject<null> | null;

  setAppBarContentRef: (ref: React.MutableRefObject<null> | null) => void;
  appBarContentRef: React.MutableRefObject<null> | null;

  setAppBarTabsRef: (ref: React.MutableRefObject<null> | null) => void;
  appBarTabsRef: React.MutableRefObject<null> | null;

  setAppBarButtonsRef: (ref: React.MutableRefObject<null> | null) => void;
  appBarButtonsRef: React.MutableRefObject<null> | null;

  setDetailPanelRef: (ref: React.MutableRefObject<null> | null) => void;
  detailPanelRef: React.MutableRefObject<null> | null;

  setPageTitle: (title: string) => void;
  pageTitle: string;
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

  setAppBarTabsRef: (refOrNull: React.MutableRefObject<null> | null) =>
    set(state => ({ ...state, appBarTabsRef: refOrNull })),
  appBarTabsRef: null,

  setAppBarButtonsRef: (refOrNull: React.MutableRefObject<null> | null) =>
    set(state => ({ ...state, appBarButtonsRef: refOrNull })),
  appBarButtonsRef: null,

  setDetailPanelRef: (refOrNull: React.MutableRefObject<null> | null) =>
    set(state => ({ ...state, detailPanelRef: refOrNull })),
  detailPanelRef: null,

  setPageTitle: (title: string) => {
    set(state => ({ ...state, pageTitle: title }));
    document.title = title;
  },
  pageTitle: '',
}));
