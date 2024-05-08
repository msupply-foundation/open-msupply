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
  setSuffix: (suffix?: string | React.ReactElement) => void;
  suffix?: string | React.ReactElement;
  setUrlParts: (urlParts: UrlPart[]) => void;
  urlParts: UrlPart[];
};

const useBreadcrumbState = create<BreadcrumbState>(set => ({
  setSuffix: suffix => set(state => ({ ...state, suffix })),
  suffix: undefined,
  setUrlParts: (urlParts: UrlPart[]) => set(state => ({ ...state, urlParts })),
  urlParts: [],
}));

export const useBreadcrumbs = (topLevelPaths: string[] = []) => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = useBreadcrumbState();
  const { urlParts, setUrlParts, setSuffix, suffix } = state;
  const { pathname } = location;

  useEffect(() => {
    const parts = pathname.split('/');
    const urlParts: UrlPart[] = [];
    parts.reduce((fullPath, part, index) => {
      if (part === '') return '';
      const path = `${fullPath}/${part}`;

      if (index > 1 || topLevelPaths.includes(part))
        urlParts.push({
          path,
          key: `${part}` as unknown as LocaleKey,
          value: part,
        });
      return path;
    }, '');

    setUrlParts(urlParts);
    setSuffix(undefined);
  }, [pathname]);

  const navigateUpOne = () => {
    if (urlParts.length < 2) return;
    navigate(urlParts[urlParts.length - 2]?.path as string);
  };

  return { urlParts, navigateUpOne, suffix, setSuffix };
};
