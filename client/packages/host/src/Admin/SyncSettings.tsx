import React, { FC, useEffect, useState } from 'react';
import { useTranslation } from '@common/intl';
import {
  BasicTextInput,
  CircularProgress,
  ErrorWithDetails,
  ErrorWithDetailsProps,
  Grid,
  LoadingButton,
  NumericTextInput,
  SaveIcon,
  SyncSettingsInput,
  Typography,
  useNotification,
} from '@openmsupply-client/common';
import { useHost } from '../api/hooks';
import { Setting } from './Setting';
import { mapSyncError } from '../api/api';

interface CommonSyncSettingProps<ValueType> {
  autocomplete?: string;
  disabled?: boolean;
  value: ValueType;
  update: (syncSettings: ValueType) => void;
}

const StringSyncSetting: FC<
  CommonSyncSettingProps<string> & { isPassword?: boolean }
> = ({ autocomplete = 'off', disabled = false, update, value, isPassword }) => {
  return (
    <BasicTextInput
      value={value}
      onChange={e => update(e.target.value)}
      type={!!isPassword ? 'password' : 'text'}
      inputProps={{ autoComplete: autocomplete }}
      disabled={disabled}
    />
  );
};

const NumericSyncSetting: FC<CommonSyncSettingProps<number>> = ({
  update,
  value,
  disabled = false,
}) => {
  return (
    <NumericTextInput
      value={value}
      onChange={e => update(Number(e.target.value))}
      disabled={disabled}
    />
  );
};

const isValid = (syncSettings: SyncSettingsInput | null) => {
  if (!syncSettings) return false;
  return (
    !!syncSettings.url &&
    !!syncSettings.username &&
    !!syncSettings.password &&
    !!syncSettings.intervalSeconds
  );
};

const SyncSettingsForm = ({
  isDisabled,
  isSaving,
  isValid,
  settings,
  onSave,
  setSyncSettings,
}: {
  isDisabled: boolean;
  isSaving: boolean;
  isValid: boolean;
  settings: SyncSettingsInput;
  onSave: () => void;
  setSyncSettings: (syncSettings: SyncSettingsInput) => void;
}) => {
  const t = useTranslation('common');
  const getSetter =
    (property: keyof SyncSettingsInput) => (value: number | string) =>
      setSyncSettings({ ...settings, [property]: value });
  return (
    <form style={{ width: '100%' }}>
      <Setting
        title={t('label.settings-url')}
        component={
          <StringSyncSetting
            disabled={isDisabled}
            value={settings['url']}
            update={getSetter('url')}
          />
        }
      />
      <Setting
        title={t('label.settings-username')}
        component={
          <StringSyncSetting
            disabled={isDisabled}
            value={settings['username']}
            update={getSetter('username')}
          />
        }
      />
      <Setting
        title={t('label.settings-password')}
        component={
          <StringSyncSetting
            isPassword={true}
            autocomplete="sync-password"
            disabled={isDisabled}
            value={settings['password']}
            update={getSetter('password')}
          />
        }
      />
      <Setting
        title={t('label.settings-interval')}
        component={
          <NumericSyncSetting
            disabled={isDisabled}
            value={settings['intervalSeconds']}
            update={getSetter('intervalSeconds')}
          />
        }
      />
      <Grid item justifyContent="flex-end" width="100%" display="flex">
        <LoadingButton
          isLoading={isSaving}
          startIcon={<SaveIcon />}
          variant="contained"
          sx={{ fontSize: '12px' }}
          disabled={!isValid}
          onClick={onSave}
        >
          {t('button.save')}
        </LoadingButton>
      </Grid>
    </form>
  );
};

interface UpdateSyncSettingsState {
  syncSettings: SyncSettingsInput | null;
  error: ErrorWithDetailsProps | null;
  isSaving: boolean;
}

const useUpdateSyncSettingsState = () => {
  const [state, set] = useState<UpdateSyncSettingsState>({
    syncSettings: null,
    error: null,
    isSaving: false,
  });

  return {
    ...state,
    setSyncSettings: (syncSettings: UpdateSyncSettingsState['syncSettings']) =>
      set(state => ({ ...state, syncSettings })),
    setError: (error: UpdateSyncSettingsState['error']) =>
      set(state => ({ ...state, error })),
    setIsSaving: (isSaving: UpdateSyncSettingsState['isSaving']) =>
      set(state => ({ ...state, isSaving })),
  };
};

export const SyncSettings = ({}) => {
  // TODO update when useTranslation works with array or when namespace is not specified
  const t = useTranslation('app');
  const { data, isError } = useHost.utils.syncSettings();
  const { mutateAsync: update } = useHost.sync.update();
  const {
    syncSettings,
    error,
    isSaving,
    setError,
    setIsSaving,
    setSyncSettings,
  } = useUpdateSyncSettingsState();
  const { success } = useNotification();

  useEffect(() => {
    if (data) {
      setSyncSettings({ ...data, password: '' });
    }
  }, [data]);

  const onSave = async () => {
    if (!syncSettings) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await update(syncSettings);
      // Map structured error
      if (response.__typename === 'SetSyncSettingErrorNode') {
        setError(
          mapSyncError(t, response.error, 'error.unable-to-save-settings')
        );
        return setIsSaving(false);
      }
    } catch (e) {
      // Set standard error
      setError({
        error: t('error.unable-to-save-settings'),
        details: (e as Error)?.message || '',
      });
      return setIsSaving(false);
    }
    setIsSaving(false);
    success(t('success.sync-settings'))();
  };

  return (
    <Grid container>
      <Typography variant="h5" color="primary" style={{ paddingBottom: 25 }}>
        {t('heading.settings-sync')}
      </Typography>
      {!syncSettings ? (
        <Grid item justifyContent="center" width="100%" display="flex">
          <CircularProgress size={20} />
        </Grid>
      ) : (
        <>
          <SyncSettingsForm
            setSyncSettings={setSyncSettings}
            isDisabled={isError}
            isSaving={isSaving}
            isValid={isValid(syncSettings)}
            settings={syncSettings}
            onSave={onSave}
          />
          {error && <ErrorWithDetails {...error} />}
        </>
      )}
    </Grid>
  );
};
