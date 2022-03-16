import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LocaleKey } from '@common/intl';

type BreadcrumbNavigationAction = 'up-one' | null;

export interface UrlPart {
  path: string;
  key: LocaleKey;
  value: string;
}

export const useBreadcrumbs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [urlParts, setUrlParts] = useState<UrlPart[]>([]);
  const [navAction, setNavAction] = useState<BreadcrumbNavigationAction>(null);

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
  }, [location]);

  useEffect(() => {
    if (!navAction) return;
    if (navAction === 'up-one') navigateUpOne();
    setNavAction(null);
  }, [navAction]);

  const navigateUpOne = () => {
    console.log('Up one breadcrumb');
    console.log('parts', urlParts);
    if (urlParts.length < 2) return;
    navigate(urlParts[urlParts.length - 2]?.path as string);
  };

  return { urlParts, setNavAction };
};
