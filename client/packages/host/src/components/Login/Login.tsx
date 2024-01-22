import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  LoadingButton,
  useHostContext,
  LocalStorage,
  ErrorWithDetails,
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

  useEffect(() => {
    const intervalId = setInterval(() => {
      // Update the remaining timeout every second
      setTimeoutRemaining(prevTimeoutRemaining =>
        prevTimeoutRemaining > 0 ? prevTimeoutRemaining - 1000 : 0
      );
    }, 1000);

    // Cleanup the interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (error && error.message === 'AccountBlocked') {
      setTimeoutRemaining(error.timeoutRemaining ?? 0);
    }
  }, [error]);

  const loginErrorMessage = useMemo(() => {
    if (!error) return '';
    if (error.message === 'AccountBlocked') {
      if (timeoutRemaining < 1000) return '';

      const milliseconds = timeoutRemaining;
      const seconds = Math.floor((milliseconds / 1000) % 60);
      const minutes = Math.floor((milliseconds / 1000 / 60) % 60);

      return `${t('error.account-blocked')} ${minutes}:${
        seconds < 10 ? `0${seconds}` : seconds
      }`;
    }
    return t('error.login');
  }, [error, timeoutRemaining]);

  useEffect(() => {
    if (!displaySettings) return;

    const { customLogo, customTheme } = displaySettings;
    if (!!customLogo) {
      LocalStorage.setItem('/theme/logo', customLogo.value);
      LocalStorage.setItem('/theme/logohash', customLogo.hash);
    }
    if (!!customTheme) {
      LocalStorage.setItem('/theme/custom', JSON.parse(customTheme.value));
      LocalStorage.setItem('/theme/customhash', customTheme.hash);
    }
  }, [displaySettings]);

  useEffect(() => {
    setPageTitle(`${t('app.login')} | ${t('app')} `);
    LocalStorage.removeItem('/auth/error');
  }, []);

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
        loginErrorMessage !== '' && (
          <ErrorWithDetails
            error={loginErrorMessage}
            details={error.detail || ''}
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
