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
  setBreadcrumbRenderers: (
    renderers?: Record<number, (part: UrlPart) => string | React.ReactElement>
  ) => void;
  setUrlParts: (urlParts: UrlPart[]) => void;
  urlParts: UrlPart[];
  renderers: Record<number, (part: UrlPart) => string | React.ReactElement>;
};

const useBreadcrumbState = create<BreadcrumbState>(set => ({
  setBreadcrumbRenderers: renderers => set(state => ({ ...state, renderers })),
  setUrlParts: (urlParts: UrlPart[]) => set(state => ({ ...state, urlParts })),
  urlParts: [],
  renderers: {},
}));

export const useBreadcrumbs = (topLevelPaths: string[] = []) => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = useBreadcrumbState();
  const { urlParts, setUrlParts, renderers, setBreadcrumbRenderers } = state;
  const { pathname } = location;

  useEffect(() => {
    const currentPath = urlParts[urlParts.length - 1]?.path;

    // This hook can be called in multiple places, but we only want to run this effect once
    // if the path has actually changed
    if (currentPath === pathname) return;

    setBreadcrumbRenderers({});

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
    renderers,
    setBreadcrumbRenderers,
  };
};
