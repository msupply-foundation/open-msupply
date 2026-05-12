import React, { useEffect } from 'react';
import {
  useTranslation,
  LoadingButton,
  useHostContext,
  SaveIcon,
  BoxedErrorWithDetails,
  useNativeClient,
  useExportLog,
  useNotification,
  EnvUtils,
  Platform,
  MuiLink,
} from '@openmsupply-client/common';
import { LoginTextInput } from '../Login/LoginTextInput';
import { InitialiseLayout } from './InitialiseLayout';
import { useInitialiseForm } from './hooks';
import { SyncProgress } from '../SyncProgress';
import { SiteInfo } from '../SiteInfo';
import { mapSyncError } from 'packages/system/src';

export const Initialise = () => {
  const t = useTranslation();
  const { setPageTitle } = useHostContext();
  const nativeClient = useNativeClient();
  const exportLog = useExportLog();
  const { warning } = useNotification();
  const isAndroid = EnvUtils.platform === Platform.Android;

  const {
    isValid,
    isLoading,
    isInitialising,
    password,
    url,
    username,
    onInitialise,
    onRetry,
    setPassword,
    setUsername,
    setUrl,
    siteCredentialsError: error,
    syncStatus,
    siteName,
  } = useInitialiseForm();

  const onSaveLog = async () => {
    if (!isAndroid) return;
    const log = await nativeClient.readLog();
    if (!log || log === 'log unavailable') {
      warning(t('error.unable-to-load-server-log'))();
      return;
    }
    await exportLog(log, 'remote_server');
  };

  const syncError =
    syncStatus?.error &&
    mapSyncError(t, syncStatus?.error, 'error.unknown-sync-error');

  useEffect(() => {
    setPageTitle(`${t('messages.not-initialised')} | ${t('app')} `);
  }, [setPageTitle, t]);

  const isInputDisabled = isInitialising || isLoading;

  return (
    <InitialiseLayout
      UsernameInput={
        <LoginTextInput
          fullWidth
          label={t('label.settings-username')}
          value={username}
          disabled={isInputDisabled}
          onChange={e => setUsername(e.target.value)}
          slotProps={{
            htmlInput: {
              autoComplete: 'username',
              autoCapitalize: 'off',
            },
          }}
          autoFocus
        />
      }
      PasswordInput={
        <LoginTextInput
          fullWidth
          label={t('label.settings-password')}
          type="password"
          value={password}
          disabled={isInputDisabled}
          onChange={e => setPassword(e.target.value)}
          slotProps={{
            htmlInput: {
              autoComplete: 'current-password',
              autoCapitalize: 'off',
            },
          }}
        />
      }
      UrlInput={
        <LoginTextInput
          fullWidth
          label={t('label.settings-url')}
          value={url}
          disabled={isInputDisabled}
          onChange={e => setUrl(e.target.value)}
        />
      }
      SyncProgress={
        <SyncProgress
          syncStatus={syncStatus}
          isOperational={false}
          colour="secondary"
        />
      }
      Button={
        <LoadingButton
          isLoading={isLoading}
          loadingStyle={{ iconColor: 'secondary.main' }}
          onClick={isInitialising ? onRetry : onInitialise}
          variant="outlined"
          startIcon={<SaveIcon />}
          disabled={
            !isValid &&
            !isInitialising /* isValid would be false if isInitialising since password is emptied out */
          }
          /* Retry will only be shown when not loading and is initialised (when sync error occurred) */
          label={isInitialising ? t('button.retry') : t('button.initialise')}
        />
      }
      ErrorMessage={error && <BoxedErrorWithDetails {...error} />}
      SyncErrorMessage={
        syncError && <BoxedErrorWithDetails {...syncError} width="100%" />
      }
      onInitialise={async () => {
        /* onInitialise from layout only happens on form key event, form is disabled when isInitialising */
        if (isValid) await onInitialise();
      }}
      SiteInfo={<SiteInfo siteName={siteName} />}
      SaveLogLink={
        isAndroid ? (
          <MuiLink
            component="button"
            type="button"
            onClick={onSaveLog}
            underline="hover"
            sx={{ fontSize: '0.8rem', color: 'gray.main' }}
          >
            {t('button.save-log')}
          </MuiLink>
        ) : undefined
      }
    />
  );
};
