import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  useInterval,
  LoadingButton,
  useHostContext,
  useLogout,
  LocalStorage,
  useFormatDateTime,
  BoxedErrorWithDetails,
  MuiLink,
} from '@openmsupply-client/common';
import { LoginTextInput } from './LoginTextInput';
import { useLoginForm } from './hooks';
import { LoginLayout } from './LoginLayout';
import { LoginStoreSelectorPanel } from './LoginStoreSelectorPanel';
import { SiteInfo } from '../SiteInfo';
import { useHost } from '../../api';

// Build-time base path (webpack DefinePlugin literal; see config.ts). Compared
// directly — not via Environment.PUBLIC_PATH — so the minifier can constant-fold
// the check: in a default build DefinePlugin substitutes '/', the "Try the new
// UI" link's condition becomes statically false, and the whole link is
// dead-code-eliminated. Only the dual-frontend build (PUBLIC_PATH=/old-ui/)
// emits it. A cross-module property read (Environment.PUBLIC_PATH) is NOT
// statically reducible, so it would ship the link in every build.
declare const PUBLIC_PATH: string;

export const Login = ({ fullSize = true }: { fullSize?: boolean }) => {
  const t = useTranslation();
  const { setPageTitle } = useHostContext();
  const logout = useLogout();
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
    showStoreSelector,
    dismissStoreSelector,
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

  // logout must only run once on mount — if it shares deps with the page
  // title effect (which re-runs when `t` changes), an i18n language change
  // during a startTransition navigation will re-trigger logout and wipe the
  // auth cookie mid-login.
  useEffect(() => {
    if (fullSize) {
      logout();
      LocalStorage.removeItem('/error/auth');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (fullSize) {
      setPageTitle(`${t('app.login')} | ${t('app')} `);
    }
  }, [setPageTitle, t, fullSize]);

  return (
    <LoginLayout
      showStoreSelector={showStoreSelector}
      StoreSelector={
        <LoginStoreSelectorPanel
          open={showStoreSelector}
          onSelected={dismissStoreSelector}
          username={username}
        />
      }
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
              'data-testid': 'login-username-input',
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
              'data-testid': 'login-password-input',
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
          data-testid="login-button"
        />
      }
      TryNewUiLink={
        // Dual-frontend packaging serves this (old) client at a subpath while
        // the new frontend lives at '/'. Only then does linking to '/' make
        // sense. Full document navigation (a plain anchor, not the router) so
        // the browser loads the new frontend at the origin root. See the
        // PUBLIC_PATH declaration above for why the check is dead-code-friendly.
        PUBLIC_PATH !== '/' && (
          <MuiLink
            href="/"
            underline="hover"
            variant="body2"
            color="secondary"
            data-testid="try-new-ui-link"
          >
            {t('login.try-new-ui')}
          </MuiLink>
        )
      }
      ErrorMessage={
        error &&
        loginError.error !== '' && (
          <div data-testid="login-error" style={{ width: '100%' }}>
            <BoxedErrorWithDetails
              details={error.detail || ''}
              error={loginError.error}
              hint={loginError.hint}
              width="100%"
            />
          </div>
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
