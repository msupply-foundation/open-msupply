import { useState, useEffect } from 'react';
import { useNavigate } from '@openmsupply-client/common';
import { UrlPart } from './Breadcrumbs';

type NavAction = 'upOne' | null;

export const useNavigateBreadcrumbs = (urlParts: UrlPart[]) => {
  const navigate = useNavigate();
  const [navAction, setNavAction] = useState<NavAction>(null);

  useEffect(() => {
    if (!navAction) return;
    if (navAction === 'upOne') navigateUpOne();
    setNavAction(null);
  }, [navAction]);

  const navigateUpOne = () => {
    console.log('Up one breadcrumb');
    console.log('parts', urlParts);
    if (urlParts.length < 2) return;
    navigate(urlParts[urlParts.length - 2]?.path as string);
  };

  return { setNavAction, navigateUpOne };
};
