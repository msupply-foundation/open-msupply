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
    customBreadcrumbs?: Record<number, string | React.ReactElement>
  ) => void;
  setUrlParts: (urlParts: UrlPart[]) => void;
  urlParts: UrlPart[];
  customBreadcrumbs: Record<number, string | React.ReactElement>;
};

const useBreadcrumbState = create<BreadcrumbState>(set => ({
  setCustomBreadcrumbs: customBreadcrumbs =>
    set(state => ({ ...state, customBreadcrumbs })),
  setUrlParts: (urlParts: UrlPart[]) => set(state => ({ ...state, urlParts })),
  urlParts: [],
  customBreadcrumbs: {},
}));

export const useBreadcrumbs = (topLevelPaths: string[] = []) => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = useBreadcrumbState();
  const { urlParts, setUrlParts, customBreadcrumbs, setCustomBreadcrumbs } =
    state;
  const { pathname } = location;

  useEffect(() => {
    const currentPath = urlParts[urlParts.length - 1]?.path;

    // This hook can be called in multiple places, but we only want to run this effect once
    // if the path has actually changed
    if (currentPath === pathname) return;

    setCustomBreadcrumbs({});

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
    setUrlParts(newUrlParts);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
