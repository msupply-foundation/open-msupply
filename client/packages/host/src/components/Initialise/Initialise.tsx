import React, { useEffect, useState } from 'react';
import {
  Tab,
  TabList,
  useTranslation,
  LoadingButton,
  useHostContext,
  SaveIcon,
  BoxedErrorWithDetails,
  EnvUtils,
  Platform,
  Box,
  Stack,
  useIsExtraSmallScreen,
} from '@openmsupply-client/common';
import { LoginTextInput } from '../Login/LoginTextInput';
import { InitialiseLayout, InitMode } from './InitialiseLayout';
import { useInitialiseForm } from './hooks';
import { SyncProgress } from '../SyncProgress';
import { mapSyncError } from 'packages/system/src';
import { StandaloneCentralTab } from './StandaloneCentralTab';

export const Initialise = () => {
  const t = useTranslation();
  const { setPageTitle } = useHostContext();
  const [mode, setMode] = useState<InitMode>('remote');
  const formState = useInitialiseForm();

  useEffect(() => {
    setPageTitle(`${t('messages.not-initialised')} | ${t('app')} `);
  }, [setPageTitle, t]);

  const isAndroid = EnvUtils.platform === Platform.Android;
  const isInputDisabled = formState.isInitialising || formState.isLoading;

  const ModeSelector = () => {
    return isAndroid ? undefined : (
      <TabList
        value={mode}
        onChange={(_, v) => !isInputDisabled && setMode(v as InitMode)}
        variant="fullWidth"
      >
        <Tab
          value="remote"
          label={t('initialise.remote-sync')}
          disabled={isInputDisabled}
        />
        <Tab
          value="central"
          label={t('initialise.central-standalone')}
          disabled={isInputDisabled}
        />
      </TabList>
    );
  };

  return (
    <InitialiseLayout>
      <ModeSelector />
      {mode === 'remote' && <RemoteForm formState={formState} />}
      {mode === 'central' && <StandaloneCentralTab />}
    </InitialiseLayout>
  );
};

type InitialiseFormState = ReturnType<typeof useInitialiseForm>;

const RemoteForm = ({ formState }: { formState: InitialiseFormState }) => {
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
  } = formState;
  const t = useTranslation();
  const isExtraSmallScreen = useIsExtraSmallScreen();
  const syncError =
    syncStatus?.error &&
    mapSyncError(t, syncStatus?.error, 'error.unknown-sync-error');
  const isInputDisabled = isInitialising || isLoading;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      onInitialise();
    }
  };

  return (
    <>
      <form onSubmit={onInitialise} onKeyDown={handleKeyDown}>
        <Stack spacing={isExtraSmallScreen ? 3 : 5}>
          <LoginTextInput
            fullWidth
            label={t('label.settings-url')}
            value={url}
            disabled={isInputDisabled}
            onChange={e => setUrl(e.target.value)}
          />
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
          {error && <BoxedErrorWithDetails {...error} />}
          <Box display="flex" justifyContent="flex-end">
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
              label={
                isInitialising ? t('button.retry') : t('button.initialise')
              }
            />
          </Box>
        </Stack>
      </form>
      <Box pt={2} width="100%">
        {syncStatus && (
          <SyncProgress
            syncStatus={syncStatus}
            isOperational={false}
            colour="secondary"
          />
        )}
      </Box>
      <Box
        pt={4}
        justifyItems="center"
        width="auto"
        px={isExtraSmallScreen ? 4 : 20}
      >
        {syncError && <BoxedErrorWithDetails {...syncError} width="100%" />}
      </Box>
    </>
  );
};
