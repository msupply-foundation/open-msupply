import React, { useEffect } from 'react';
import {
  useTranslation,
  LoadingButton,
  Box,
  Typography,
  useHostContext,
  SaveIcon,
  AlertIcon,
} from '@openmsupply-client/common';
import { LoginTextInput } from '../Login/LoginTextInput';
import { InitialiseLayout } from './InitialiseLayout';
import { useInitialiseForm } from './hooks';
import { SyncProgress } from '../SyncProgress';

export const Initialise = () => {
  const t = useTranslation('app');
  const { setPageTitle } = useHostContext();

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
  } = useInitialiseForm();

  useEffect(() => {
    setPageTitle(`${t('app.initialise')} | ${t('app')} `);
  }, []);

  return (
    <InitialiseLayout
      UsernameInput={
        <LoginTextInput
          fullWidth
          label={t('label.settings-username')}
          value={username}
          disabled={isInitialising}
          onChange={e => setUsername(e.target.value)}
          inputProps={{
            autoComplete: 'username',
            autocapitalize: 'off',
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
          disabled={isInitialising}
          onChange={e => setPassword(e.target.value)}
          inputProps={{
            autoComplete: 'current-password',
            autocapitalize: 'off',
          }}
        />
      }
      UrlInput={
        <LoginTextInput
          fullWidth
          label={t('label.settings-url')}
          value={url}
          disabled={isInitialising}
          onChange={e => setUrl(e.target.value)}
        />
      }
      SyncProgress={
        <SyncProgress syncStatus={syncStatus} isOperational={false} />
      }
      Button={
        <LoadingButton
          isLoading={isLoading}
          onClick={isInitialising ? onRetry : onInitialise}
          variant="outlined"
          startIcon={<SaveIcon />}
          disabled={
            !isValid &&
            !isInitialising /* isValid would be false if isInitialising since password is emptied out */
          }
        >
          {/* Retry will only be shown when not loading and is initialised (when sync error occured) */}
          {isInitialising ? t('button.retry') : t('button.initialise')}
        </LoadingButton>
      }
      ErrorMessage={
        error && (
          <Box display="flex" sx={{ color: 'error.main' }} gap={1}>
            <Box>
              <AlertIcon />
            </Box>
            <Box>
              <Typography sx={{ color: 'inherit' }}>
                {error.message || t('error.login')}
              </Typography>
            </Box>
          </Box>
        )
      }
      onInitialise={async () => {
        /* onInitialise from layout only happens on form key event, form is disabled when isInitialising */
        if (isValid) await onInitialise();
      }}
    />
  );
};
