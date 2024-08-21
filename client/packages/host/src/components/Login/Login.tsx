import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  useInterval,
  LoadingButton,
  useHostContext,
  LocalStorage,
  ErrorWithDetails,
  useFormatDateTime,
} from '@openmsupply-client/common';
import { LoginTextInput } from './LoginTextInput';
import { useLoginForm } from './hooks';
import { LoginLayout } from './LoginLayout';
import { SiteInfo } from '../SiteInfo';
import { useHost } from '../../api';

export const Login = () => {
  const t = useTranslation('app');
  const { setPageTitle } = useHostContext();
  const hashInput = {
    logo: LocalStorage.getItem('/theme/logohash') ?? '',
    theme: LocalStorage.getItem('/theme/customhash') ?? '',
  };
  const { data: displaySettings } = useHost.settings.displaySettings(hashInput);
  const passwordRef = React.useRef(null);
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
  } = useLoginForm(passwordRef);
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
      return { error: t('error.login'), hint: t('error.login-support') };
    }

    if (error.message === 'NoSiteAccess') {
      return {
        error: t('error.unable-to-login'),
        hint: t('error.no-site-access'),
      };
    }

    if (error?.stdError === 'Internal error') {
      return { error: t('error.internal-error') };
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
    setPageTitle(`${t('app.login')} | ${t('app')} `);
    LocalStorage.removeItem('/error/auth');
  }, [setPageTitle, t]);

  return (
    <LoginLayout
      UsernameInput={
        <LoginTextInput
          fullWidth
          label={t('heading.username')}
          value={username}
          disabled={isLoggingIn}
          onChange={e => setUsername(e.target.value)}
          inputProps={{
            autoComplete: 'username',
            name: 'username',
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
          inputProps={{
            autoComplete: 'current-password',
            name: 'password',
          }}
          inputRef={passwordRef}
        />
      }
      LoginButton={
        <LoadingButton
          isLoading={isLoggingIn}
          onClick={onLogin}
          variant="outlined"
          endIcon={<ArrowRightIcon />}
          disabled={!isValid}
        >
          {t('button.login')}
        </LoadingButton>
      }
      ErrorMessage={
        error &&
        loginError.error !== '' && (
          <ErrorWithDetails
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
    />
  );
};
