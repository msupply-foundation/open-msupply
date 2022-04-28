import React, { useEffect } from 'react';
import {
  useTranslation,
  LoadingButton,
  Box,
  Typography,
  AlertIcon,
  useHostContext,
  SaveIcon,
} from '@openmsupply-client/common';
import { LoginTextInput } from '../Login/LoginTextInput';
import { InitialiseLayout } from './InitialiseLayout';
import { useInitialiseForm } from './hooks';

export const Initialise = () => {
  const t = useTranslation('app');
  const { setPageTitle } = useHostContext();

  const {
    isValid,
    isLoading,
    password,
    siteId,
    url,
    username,
    onSave,
    setPassword,
    setUsername,
    setSiteId,
    setUrl,
    error,
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
          disabled={isLoading}
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
          label={t('label.settings-password')}
          type="password"
          value={password}
          disabled={isLoading}
          onChange={e => setPassword(e.target.value)}
          inputProps={{
            autoComplete: 'current-password',
          }}
        />
      }
      UrlInput={
        <LoginTextInput
          fullWidth
          label={t('label.settings-url')}
          value={url}
          disabled={isLoading}
          onChange={e => setUrl(e.target.value)}
        />
      }
      SiteIdInput={
        <LoginTextInput
          fullWidth
          label={t('label.settings-site-id')}
          value={siteId}
          disabled={isLoading}
          onChange={e => {
            const siteId = Number(e.target.value);
            setSiteId(Number.isNaN(siteId) ? 0 : siteId);
          }}
        />
      }
      SaveButton={
        <LoadingButton
          isLoading={isLoading}
          onClick={onSave}
          variant="outlined"
          startIcon={<SaveIcon />}
          disabled={!isValid}
        >
          {t('button.save')}
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
      onSave={async () => {
        if (isValid) await onSave();
      }}
    />
  );
};
