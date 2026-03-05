import { useToggle } from '@common/hooks';
import { AppRoute } from '@openmsupply-client/config';
import React, { useEffect } from 'react';
import {
  AlertIcon,
  AuthError,
  Grid,
  LocalStorage,
  Location,
  RouteBuilder,
  matchPath,
  useLocalStorage,
  useLocation,
  useNavigate,
} from '@openmsupply-client/common';
import { AlertModal, BasicModal, Typography } from '@common/components';
import { LocaleKey, TypedTFunction, useTranslation } from '@common/intl';
import { Login } from './Login';

// primarily used to display an error message when the user is not logged in
export const ErrorAlert = () => {
  const navigate = useNavigate();
  const { isOn, toggleOff, toggleOn } = useToggle();
  const t = useTranslation();
  const location = useLocation();
  const [error, , removeError] = useLocalStorage('/error/auth');

  useEffect(() => {
    if (!!error) toggleOn();
    return () => toggleOff();
  }, [error, toggleOff, toggleOn]);

  // no need to alert if you are on the login screen
  if (
    matchPath(
      RouteBuilder.create(AppRoute.Login).addWildCard().build(),
      location.pathname
    ) ||
    matchPath(
      RouteBuilder.create(AppRoute.Initialise).addWildCard().build(),
      location.pathname
    ) ||
    matchPath(RouteBuilder.create(AppRoute.Android).build(), location.pathname)
  ) {
    return null;
  }
  const onOk = () => {
    const state = {} as { from?: Location };
    if (error === AuthError.Unauthenticated || error === AuthError.Timeout) {
      state.from = location;
    }

    if (error === AuthError.PermissionDenied) {
      toggleOff();
      setTimeout(removeError, 200);
      return;
    }

    navigate(`/${AppRoute.Login}`, {
      replace: true,
      state,
    });
  };

  const translatedError = translateErrorMessage(error, t);
  if (!translatedError) return null;

  return error === AuthError.Unauthenticated || error === AuthError.Timeout ? (
    // if the user is unauthenticated or timed out, show a modal with the login form
    <BasicModal open={isOn} width={400} height={150}>
      <Grid padding={4} container gap={1} flexDirection="column">
        <Grid container gap={1}>
          <Grid>
            <AlertIcon color="primary" />
          </Grid>
          <Grid>
            <Typography
              id="transition-modal-title"
              variant="h6"
              component="span"
            >
              {translatedError.title}
            </Typography>
          </Grid>
        </Grid>
        <Grid style={{ whiteSpace: 'pre-line' }}>
          {translatedError.message}
        </Grid>
        <Login fullSize={false} />
      </Grid>
    </BasicModal>
  ) : (
    // for other errors, show a simple alert modal with the error message
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
        title: t('auth.alert-title'),
        message: t('auth.unauthenticated-message'),
      };
    case AuthError.Timeout:
      return {
        title: t('auth.timeout-title'),
        message: t('auth.timeout-message'),
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
    case AuthError.ServerError:
      const error = LocalStorage.getItem('/error/server');
      const message =
        error === null ? (
          t('auth.server-error')
        ) : (
          <>
            {t('auth.server-error')}
            <Typography color="error" paddingBottom={2} paddingTop={2}>
              {error}
            </Typography>
          </>
        );

      return {
        title: t('heading.server-error'),
        message,
      };
    default:
      return undefined;
  }
};
