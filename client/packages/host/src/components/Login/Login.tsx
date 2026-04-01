import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  useInterval,
  LoadingButton,
  useHostContext,
  useAuthContext,
  LocalStorage,
  useFormatDateTime,
  BoxedErrorWithDetails,
} from '@openmsupply-client/common';
import { LoginTextInput } from './LoginTextInput';
import { useLoginForm } from './hooks';
import { LoginLayout } from './LoginLayout';
import { SiteInfo } from '../SiteInfo';
import { useHost } from '../../api';

export const Login = ({ fullSize = true }: { fullSize?: boolean }) => {
  const t = useTranslation();
  const { setPageTitle } = useHostContext();
  const { logout } = useAuthContext();
  const hashInput = {
    logo: LocalStorage.getItem('/theme/logohash') ?? '',
    theme: LocalStorage.getItem('/theme/customhash') ?? '',
  };
  const { data: displaySettings } = useHost.settings.displaySettings(hashInput);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const {
    isValid,
    password,
    setPassword,
    username,
    setUsername,
    isLoggingIn,
    onLogin,
    error,
    siteName,
  } = useLoginForm(passwordRef, fullSize);
  const [timeoutRemaining, setTimeoutRemaining] = useState(
    error?.timeoutRemaining ?? 0
  );
  const { customDate } = useFormatDateTime();

  useInterval(
    () => {
      setTimeoutRemaining(prevTimeoutRemaining =>
        prevTimeoutRemaining > 0 ? prevTimeoutRemaining - 1000 : 0
      );
    },
    timeoutRemaining > 0 ? 1000 : null
  );

  useEffect(() => {
    if (error && error.message === 'AccountBlocked') {
      setTimeoutRemaining(error.timeoutRemaining ?? 0);
    }
  }, [error]);

  const loginError: { error: string; hint?: string } = useMemo(() => {
    if (!error) return { error: '' };

    if (error.message === 'ConnectionError') {
      return {
        error: t('error.connection-error'),
        hint: t('error.connection-error-hint'),
      };
    }

    if (error.message === 'AccountBlocked') {
      if (timeoutRemaining < 1000) return { error: '' };

      const formattedTime = customDate(
        new Date(0, 0, 0, 0, 0, 0, timeoutRemaining),
        'm:ss'
      );
      return { error: `${t('error.account-blocked')} ${formattedTime}` };
    }

    if (error.message === 'InvalidCredentials') {
      return { error: t('error.login') };
    }

    if (error.message === 'CentralSyncRequired') {
      return { error: t('error.missing-central-sync') };
    }

    if (error.message === 'NoSiteAccess') {
      return {
        error: t('error.unable-to-login'),
        hint: t('error.no-site-access'),
      };
    }

    if (error?.stdError === 'Internal error') {
      return {
        error: t('error.internal-error'),
        hint: t('error.login-support'),
      };
    }

    // Treat failed to fetch error as a connection error as this is the most likely cause, and provides a more helpful message to the user
    if (
      error?.detail?.includes('Failed to fetch') || // Chrome
      error?.detail?.includes('NetworkError') // Firefox
    ) {
      return {
        error: t('error.connection-error'),
        hint: t('error.connection-error-hint'),
      };
    }

    return {
      error: t('error.authentication-error'),
    };
  }, [error, timeoutRemaining, customDate, t]);

  useEffect(() => {
    if (!displaySettings) return;

    const { customLogo, customTheme } = displaySettings;
    if (!!customLogo) {
      LocalStorage.setItem('/theme/logo', customLogo.value);
      LocalStorage.setItem('/theme/logohash', customLogo.hash);
    }
    if (!!customTheme) {
      LocalStorage.setItem(
        '/theme/custom',
        !!customTheme.value ? JSON.parse(customTheme.value) : ''
      );
      LocalStorage.setItem('/theme/customhash', customTheme.hash);
    }
  }, [displaySettings]);

  useEffect(() => {
    if (fullSize) {
      logout();
      setPageTitle(`${t('app.login')} | ${t('app')} `);
      LocalStorage.removeItem('/error/auth');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPageTitle, t, fullSize]);

  return (
    <LoginLayout
      UsernameInput={
        <LoginTextInput
          fullWidth
          label={t('heading.username')}
          value={username}
          disabled={isLoggingIn}
          onChange={e => setUsername(e.target.value)}
          slotProps={{
            htmlInput: {
              autoComplete: 'username',
              name: 'username',
            },
          }}
          autoFocus
        />
      }
      PasswordInput={
        <LoginTextInput
          fullWidth
          label={t('heading.password')}
          type="password"
          value={password}
          disabled={isLoggingIn}
          onChange={e => setPassword(e.target.value)}
          slotProps={{
            htmlInput: {
              autoComplete: 'current-password',
              name: 'password',
            },
          }}
          inputRef={passwordRef}
        />
      }
      LoginButton={
        <LoadingButton
          shouldShrink={false}
          isLoading={isLoggingIn}
          onClick={onLogin}
          variant="outlined"
          endIcon={<ArrowRightIcon />}
          disabled={!isValid}
          label={t('button.login')}
        />
      }
      ErrorMessage={
        error &&
        loginError.error !== '' && (
          <BoxedErrorWithDetails
            details={error.detail || ''}
            error={loginError.error}
            hint={loginError.hint}
          />
        )
      }
      onLogin={async () => {
        if (isValid) await onLogin();
      }}
      SiteInfo={<SiteInfo siteName={siteName} />}
      fullSize={fullSize}
    />
  );
};
