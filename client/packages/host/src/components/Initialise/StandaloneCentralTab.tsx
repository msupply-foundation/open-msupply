import React, { useState } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import {
  Box,
  Stack,
  LoadingButton,
  SaveIcon,
  BoxedErrorWithDetails,
  useTranslation,
  useNavigate,
} from '@openmsupply-client/common';
import { useSync } from '@openmsupply-client/system';
import { LoginTextInput } from '../Login/LoginTextInput';
import { SettingsSubHeading } from '../../Admin/SettingsSection';

export const StandaloneCentralTab = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { mutateAsync, isLoading } = useSync.sync.initialiseAsCentralServer();

  const [storeName, setStoreName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ message: string; details: string } | null>(null);

  const isValid =
    storeName.trim().length > 0 &&
    username.trim().length > 0 &&
    password.length > 0;

  const onInitialise = async () => {
    if (!isValid || isLoading) return;
    setError(null);
    try {
      const response = await mutateAsync({
        storeName: storeName.trim(),
        adminUsername: username.trim(),
        adminPassword: password,
      });
      if (response.__typename === 'StandaloneCentralInitialisedNode') {
        navigate(`/${AppRoute.Login}`, { replace: true });
      } else {
        setError({
          message:
            response.error.description ??
            t('error.failed-to-initialise-standalone-central'),
          details: response.error.__typename,
        });
      }
    } catch (e) {
      setError({
        message:
          (e as Error)?.message ??
          t('error.failed-to-initialise-standalone-central'),
        details: (e as Error)?.stack ?? '',
      });
    }
  };

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onInitialise();
      }}
    >
      <Stack spacing={3}>
        <LoginTextInput
          fullWidth
          label={t('label.store-name')}
          value={storeName}
          disabled={isLoading}
          onChange={e => setStoreName(e.target.value)}
          slotProps={{
            htmlInput: { autoComplete: 'off', autoCapitalize: 'off' },
          }}
          autoFocus
        />
        <Stack spacing={1}>
          <SettingsSubHeading title={t('heading.admin-user')} />
          <Stack spacing={3}>
            <LoginTextInput
              fullWidth
              label={t('heading.username')}
              value={username}
              disabled={isLoading}
              onChange={e => setUsername(e.target.value)}
              slotProps={{
                htmlInput: { autoComplete: 'off', autoCapitalize: 'off' },
              }}
            />
            <LoginTextInput
              fullWidth
              label={t('heading.password')}
              type="password"
              value={password}
              disabled={isLoading}
              onChange={e => setPassword(e.target.value)}
              slotProps={{
                htmlInput: {
                  autoComplete: 'new-password',
                  autoCapitalize: 'off',
                },
              }}
            />
          </Stack>
        </Stack>
        {error && (
          <BoxedErrorWithDetails
            error={error.message}
            details={error.details}
          />
        )}
        <Box display="flex" justifyContent="flex-end">
          <LoadingButton
            isLoading={isLoading}
            loadingStyle={{ iconColor: 'secondary.main' }}
            type="submit"
            variant="outlined"
            startIcon={<SaveIcon />}
            disabled={!isValid}
            label={t('button.initialise-as-central-server')}
          />
        </Box>
      </Stack>
    </form>
  );
};
