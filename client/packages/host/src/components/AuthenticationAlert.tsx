import { useToggle } from '@common/hooks';
import { AppRoute } from 'packages/config/src';
import React, { useEffect } from 'react';
import {
  AuthError,
  matchPath,
  Location,
  RouteBuilder,
  useLocalStorage,
  useLocation,
  useNavigate,
} from '@openmsupply-client/common';
import { AlertModal } from '@common/components';
import { LocaleKey, TypedTFunction, useTranslation } from '@common/intl';

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
  const onOk = () => {
    const state = {} as { from?: Location };
    if (error === AuthError.Unauthenticated) {
      state.from = location;
    }

    navigate(`/${AppRoute.Login}`, {
      replace: true,
      state,
    });
  };

  const translatedError = translateErrorMessage(error, t);
  if (!translatedError) return null;

  return (
    <AlertModal
      important
      open={isOn}
      title={translatedError.title}
      message={translatedError.message}
      onOk={onOk}
    />
  );
};

const translateErrorMessage = (
  error: AuthError | null | undefined,
  t: TypedTFunction<LocaleKey>
) => {
  switch (error) {
    case AuthError.Unauthenticated:
      return {
        title: t('auth.timeout-title'),
        message: t('auth.logged-out-message'),
      };
    case AuthError.NoStoreAssigned:
      return {
        title: t('auth.alert-title'),
        message: t('auth.no-store-assigned'),
      };
    case AuthError.PermissionDenied:
      return {
        title: t('auth.alert-title'),
        message: t('auth.permission-denied'),
      };
    default:
      return undefined;
  }
};
