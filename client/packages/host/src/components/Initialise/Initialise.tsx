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
  Grid,
  Typography,
  Theme,
} from '@openmsupply-client/common';
import { LoginTextInput } from '../Login/LoginTextInput';
import { useInitialiseForm } from './hooks';
import { SyncProgress } from '../SyncProgress';
import { mapSyncError } from 'packages/system/src';
import { StandaloneCentralTab } from './StandaloneCentralTab';
import { AppVersion } from '../AppVersion';
import { LanguageButton } from '../LanguageButton';
import { LoginIcon } from '../Login/LoginIcon';

type InitMode = 'remote' | 'central';

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
  const isExtraSmallScreen = useIsExtraSmallScreen();

  return (
    <Grid container sx={{ flex: 1 }}>
      <Grid
        size={{ xs: 12, sm: 6 }}
        sx={theme => ({
          backgroundImage: theme.mixins.gradient.secondary,
          padding: '0 80px 7% 80px',
          [theme.breakpoints.down('sm')]: {
            padding: '2em',
          },
        })}
      >
        <Welcome />
      </Grid>
      <Grid
        size={{ xs: 12, sm: 6 }}
        sx={theme => ({
          display: 'flex',
          flexDirection: 'column',
          [theme.breakpoints.down('sm')]: {
            overflowY: 'unset',
          },
          backgroundColor: 'background.login',
        })}
      >
        <Stack
          sx={theme => ({
            [theme.breakpoints.down('sm')]: {
              justifyContent: 'flex-start',
              paddingTop: '1.5em',
            },
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Stack spacing={isExtraSmallScreen ? 2 : 3}>
            <Stack direction="row" sx={{ justifyContent: 'center' }}>
              <LoginIcon small />
            </Stack>
            {!isAndroid && (
              <TabList
                value={mode}
                onChange={(_, v) =>
                  !isInputDisabled && setMode(v as InitMode)
                }
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
            )}
            {mode === 'remote' && <RemoteForm formState={formState} />}
            {mode === 'central' && <StandaloneCentralTab />}
          </Stack>
        </Stack>
        <Box>
          <AppVersion style={{ opacity: 0.4 }} />
        </Box>
        <LanguageButton />
      </Grid>
    </Grid>
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

const Welcome = () => {
  const t = useTranslation();
  return (
    <Stack spacing="45px" justifyContent="end">
      <Typography
        sx={{
          color: (theme: Theme) => theme.typography.login.color,
          fontSize: {
            xs: '20px',
            sm: '20px',
            md: '48px',
            lg: '64px',
            xl: '64px',
          },
          fontWeight: 'bold',
          lineHeight: 'normal',
          whiteSpace: 'pre-line',
        }}
      >
        {t('initialise.heading')}
      </Typography>
      <Typography
        sx={{
          fontSize: {
            xs: '14px',
            sm: '14px',
            md: '16px',
            lg: '20px',
            xl: '20px',
          },
          color: (theme: Theme) => theme.typography.login.color,
          fontWeight: 600,
          whiteSpace: 'pre-line',
        }}
      >
        {t('initialise.body')}
      </Typography>
    </Stack>
  );
};
