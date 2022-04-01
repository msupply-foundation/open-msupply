import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LocaleKey } from '@common/intl';
import create from 'zustand';

export interface UrlPart {
  path: string;
  key: LocaleKey;
  value: string;
}

type BreadcrumbState = {
  setSuffix: (suffix?: string) => void;
  suffix?: string;
  setUrlParts: (urlParts: UrlPart[]) => void;
  urlParts: UrlPart[];
};

const useBreadcrumbState = create<BreadcrumbState>(set => ({
  setSuffix: suffix => set(state => ({ ...state, suffix })),
  suffix: undefined,
  setUrlParts: (urlParts: UrlPart[]) => set(state => ({ ...state, urlParts })),
  urlParts: [],
}));

export const useBreadcrumbs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = useBreadcrumbState();
  const { urlParts, setUrlParts, setSuffix, suffix } = state;

  useEffect(() => {
    const parts = location.pathname.split('/');
    const urlParts: UrlPart[] = [];

    parts.reduce((fullPath, part, index) => {
      if (part === '') return '';
      const path = `${fullPath}/${part}`;

      if (index > 1)
        urlParts.push({
          path,
          key: `${part}` as unknown as LocaleKey,
          value: part,
        });
      return path;
    }, '');
    setUrlParts(urlParts);
    setSuffix(undefined);
  }, [location]);

  const navigateUpOne = () => {
    if (urlParts.length < 2) return;
    navigate(urlParts[urlParts.length - 2]?.path as string);
  };

  return { urlParts, navigateUpOne, suffix, setSuffix };
};
