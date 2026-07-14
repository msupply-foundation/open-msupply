import { create } from 'zustand';

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

  setFullScreen: (fullScreen: boolean) => void;
  fullScreen: boolean;

  // Number of `AppFooterPortal` instances currently mounted with non-empty
  // `Content`. Used by `AppFooterStatusPortal` to step aside whenever any
  // actions footer is present, so a parent can register a default (e.g.
  // status crumbs) and a child tab can override with its own content. The
  // mount count is a coarse signal — a portal mounted with an empty fragment
  // still increments the count, so a child that wants the parent status
  // footer to show through must return null instead of rendering an empty
  // `AppFooterPortal` (see `system/src/Documents/Footer.tsx`).
  footerActionsCount: number;
  incrementFooterActions: () => void;
  decrementFooterActions: () => void;
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

  setFullScreen: (fullScreen: boolean) =>
    set(state => ({ ...state, fullScreen })),
  fullScreen: false,

  footerActionsCount: 0,
  incrementFooterActions: () =>
    set(state => ({
      ...state,
      footerActionsCount: state.footerActionsCount + 1,
    })),
  decrementFooterActions: () =>
    set(state => ({
      ...state,
      footerActionsCount: Math.max(0, state.footerActionsCount - 1),
    })),
}));
