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

  const loginErrorMessage = useMemo(() => {
    if (!error) return '';
    if (error.message === 'AccountBlocked') {
      if (timeoutRemaining < 1000) return '';

      const formattedTime = customDate(
        new Date(0, 0, 0, 0, 0, 0, timeoutRemaining),
        'm:ss'
      );
      return `${t('error.account-blocked')} ${formattedTime}`;
    }
    if (error?.detail?.includes('UpdateUserError')) {
      return t('error.database-busy');
    }

    return t('error.login');
  }, [error, timeoutRemaining, customDate, t]);

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
