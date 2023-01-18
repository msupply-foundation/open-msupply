import React, { useEffect } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  LoadingButton,
  useHostContext,
  LocalStorage,
  ErrorWithDetails,
} from '@openmsupply-client/common';
import { useHost } from '../../api/hooks';
import { LoginTextInput } from './LoginTextInput';
import { useLoginForm } from './hooks';
import { LoginLayout } from './LoginLayout';
import { SiteInfo } from '../SiteInfo';

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
        error && (
          <ErrorWithDetails
            error={error.message || t('error.login')}
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
