import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LocaleKey } from '@common/intl';
import { create } from 'zustand';

export interface UrlPart {
  disabled?: boolean;
  path: string;
  key: LocaleKey;
  value: string;
}

type BreadcrumbState = {
  setCustomBreadcrumbs: (
    customBreadcrumbs?: Record<number, string | React.ReactElement>,
    disabled?: number[]
  ) => void;
  setUrlParts: (
    urlParts: UrlPart[],
    derivedPathname: string,
    derivedTopLevelPaths: string
  ) => void;
  urlParts: UrlPart[];
  customBreadcrumbs: Record<number, string | React.ReactElement>;
  // The (pathname, topLevelPaths) inputs that produced the current `urlParts`.
  // The deriving effect compares against these to tell a real navigation apart
  // from a change in the known top-level paths (plugin category keys arrive
  // after the remote bundle loads — see the effect in `useBreadcrumbs`).
  derivedPathname: string;
  derivedTopLevelPaths: string;
};

const useBreadcrumbState = create<BreadcrumbState>(set => ({
  setCustomBreadcrumbs: (customBreadcrumbs, disabled = []) =>
    set(state => {
      const urlParts = state.urlParts.map((part, index) =>
        disabled.includes(index) ? { ...part, disabled: true } : part
      );
      return { ...state, urlParts, customBreadcrumbs };
    }),
  setUrlParts: (urlParts, derivedPathname, derivedTopLevelPaths) =>
    set(state => ({
      ...state,
      urlParts,
      derivedPathname,
      derivedTopLevelPaths,
    })),
  urlParts: [],
  customBreadcrumbs: {},
  derivedPathname: '',
  derivedTopLevelPaths: '',
}));

export const useBreadcrumbs = (topLevelPaths: string[] = []) => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = useBreadcrumbState();
  const { urlParts, setUrlParts, customBreadcrumbs, setCustomBreadcrumbs } =
    state;
  const { pathname } = location;

  useEffect(() => {
    // Only the "router" caller (the AppBar's `<Breadcrumbs>`, which knows the
    // app's top-level paths + plugin category keys) should derive `urlParts`.
    // Other callers — e.g. detail views that just want `setCustomBreadcrumbs`
    // — pass no `topLevelPaths` and would otherwise clobber the rich
    // derivation with their own (which filters out URL index-1 segments).
    if (topLevelPaths.length === 0) return;

    const topLevelKey = topLevelPaths.join(',');
    const { derivedPathname, derivedTopLevelPaths } =
      useBreadcrumbState.getState();

    // Re-derive on navigation OR when the known top-level paths change. The
    // latter matters because plugin category keys are added asynchronously
    // (the remote bundle loads after first paint): a page refreshed directly
    // onto a plugin route (e.g. `/daily-tally/{id}`) first derives without the
    // category in `topLevelPaths`, so the `/daily-tally` segment is dropped and
    // only the id crumb survives. Once the keys arrive we must re-split the
    // same path to restore the category crumb. Skip only when both inputs are
    // unchanged (a benign remount) so we don't needlessly clear crumbs.
    if (derivedPathname === pathname && derivedTopLevelPaths === topLevelKey)
      return;

    // Clear the previous page's custom crumbs only on a real navigation. When
    // just the top-level paths changed we're re-splitting the SAME path, so
    // keep the crumbs the page already set — its own effects won't necessarily
    // re-run to restore them.
    if (derivedPathname !== pathname) setCustomBreadcrumbs({});

    const parts = pathname.split('/');
    const newUrlParts: UrlPart[] = [];
    parts.reduce((fullPath, part, index) => {
      if (part === '') return '';
      const path = `${fullPath}/${part}`;

      if (index > 1 || topLevelPaths.includes(part))
        newUrlParts.push({
          path,
          key: `${part}` as unknown as LocaleKey,
          value: part,
        });
      return path;
    }, '');
    setUrlParts(newUrlParts, pathname, topLevelKey);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, topLevelPaths.join(',')]);

  const navigateUpOne = () => {
    if (urlParts.length < 2) return;
    navigate(urlParts[urlParts.length - 2]?.path as string);
  };

  return {
    urlParts,
    navigateUpOne,
    customBreadcrumbs,
    /**
     * Accepts an object, of type `{ [key: number]: string | ReactNode }` where:
     * - the key is the index of the breadcrumb that you wish the replace
     * - the value is the text or React element to render
     */
    setCustomBreadcrumbs,
  };
};
