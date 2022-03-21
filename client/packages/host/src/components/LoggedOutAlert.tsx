import { useToggle } from '@common/hooks';
import { AppRoute } from 'packages/config/src';
import React, { useEffect } from 'react';
import {
  matchPath,
  RouteBuilder,
  useAuthContext,
  useLocation,
  useNavigate,
} from '@openmsupply-client/common';
import { AlertModal } from '@common/components';
import { useTranslation } from '@common/intl';

export const LoggedOutAlert = () => {
  const navigate = useNavigate();
  const { isOn, toggleOff, toggleOn } = useToggle();
  const t = useTranslation('app');
  const location = useLocation();
  const { token } = useAuthContext();

  useEffect(() => {
    if (!token) toggleOn();
    return () => toggleOff();
  }, [token]);

  // no need to alert if you are on the login screen!
  if (
    matchPath(
      RouteBuilder.create(AppRoute.Login).addWildCard().build(),
      location.pathname
    )
  ) {
    return null;
  }

  return (
    <AlertModal
      open={isOn}
      title={t('auth.logged-out-title')}
      message={t('auth.logged-out-message')}
      onOk={() => {
        navigate(AppRoute.Login);
      }}
    />
  );
};
