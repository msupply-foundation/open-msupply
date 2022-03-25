import { useToggle } from '@common/hooks';
import { AppRoute } from 'packages/config/src';
import React, { useEffect } from 'react';
import {
  AuthError,
  matchPath,
  RouteBuilder,
  useLocalStorage,
  useLocation,
  useNavigate,
} from '@openmsupply-client/common';
import { AlertModal } from '@common/components';
import { useTranslation } from '@common/intl';

export const AuthenticationAlert = () => {
  const navigate = useNavigate();
  const { isOn, toggleOff, toggleOn } = useToggle();
  const t = useTranslation('app');
  const location = useLocation();
  const [error] = useLocalStorage('/auth/error');

  useEffect(() => {
    if (!!error) toggleOn();
    return () => toggleOff();
  }, [error]);

  // no need to alert if you are on the login screen!
  if (
    matchPath(
      RouteBuilder.create(AppRoute.Login).addWildCard().build(),
      location.pathname
    )
  ) {
    return null;
  }
  const message =
    error === AuthError.Unauthenticated
      ? t('auth.logged-out-message')
      : t('auth.permission-denied');

  return (
    <AlertModal
      open={isOn}
      title={t('auth.alert-title')}
      message={message}
      onOk={() => {
        navigate(AppRoute.Login);
      }}
    />
  );
};
