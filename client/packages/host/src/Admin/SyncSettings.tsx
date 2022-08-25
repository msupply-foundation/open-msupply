import React, { FC, useState } from 'react';
import { useTranslation } from '@common/intl';
import {
  BasicTextInput,
  CircularProgress,
  Grid,
  LoadingButton,
  NumericTextInput,
  SaveIcon,
  Typography,
  UpdateSyncSettingsInput,
  useNotification,
} from '@openmsupply-client/common';
import { useHost } from '../api/hooks';
import { Setting } from './Setting';

type SyncSettings = Omit<UpdateSyncSettingsInput, '__typename'>;

interface SyncSettingProps {
  autocomplete?: string;
  disabled?: boolean;
  property: keyof SyncSettings;
  settings?: SyncSettings;
  type?: string;
  update: (syncSettings: SyncSettings) => void;
}

const StringSyncSetting: FC<SyncSettingProps> = ({
  autocomplete = 'off',
  disabled = false,
  property,
  type = 'text',
  settings,
  update,
}) => {
  const value = settings?.[property] || '';
  const onChange = (value: string) => {
    const patched = { ...settings, [property]: value } as SyncSettings;
    update(patched);
  };
  return (
    <BasicTextInput
      value={value}
      onChange={e => onChange(e.target.value)}
      type={type}
      inputProps={{ autoComplete: autocomplete }}
      disabled={disabled}
    />
  );
};

const NumericSyncSetting: FC<SyncSettingProps> = ({
  property,
  settings,
  update,
  disabled,
}) => {
  const value = settings?.[property] || '';
  const onChange = (value: string) => {
    const patched = {
      ...settings,
      [property]: Number(value),
    } as SyncSettings;
    update(patched);
  };
  return (
    <NumericTextInput
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
    />
  );
};
const isValid = (syncSettings: SyncSettings | null) => {
  if (!syncSettings) return false;
  return (
    !!syncSettings.url &&
    !!syncSettings.username &&
    !!syncSettings.password &&
    !!syncSettings.intervalSec &&
    !!syncSettings.centralServerSiteId
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
  settings?: SyncSettings;
  onSave: () => void;
  setSyncSettings: (syncSettings: SyncSettings) => void;
}) => {
  const t = useTranslation('common');
  return (
    <form style={{ width: '100%' }}>
      <Setting
        title={t('label.settings-url')}
        component={
          <StringSyncSetting
            property="url"
            settings={settings}
            disabled={isDisabled}
            update={setSyncSettings}
          />
        }
      />
      <Setting
        title={t('label.settings-username')}
        component={
          <StringSyncSetting
            property="username"
            settings={settings}
            disabled={isDisabled}
            update={setSyncSettings}
          />
        }
      />
      <Setting
        title={t('label.settings-password')}
        component={
          <StringSyncSetting
            property="password"
            type="password"
            autocomplete="sync-password"
            settings={settings}
            disabled={isDisabled}
            update={setSyncSettings}
          />
        }
      />
      <Setting
        title={t('label.settings-interval')}
        component={
          <NumericSyncSetting
            property="intervalSec"
            settings={settings}
            disabled={isDisabled}
            update={setSyncSettings}
          />
        }
      />
      <Setting
        title={t('label.settings-central-site-id')}
        component={
          <NumericSyncSetting
            property="centralServerSiteId"
            settings={settings}
            disabled={isDisabled}
            update={setSyncSettings}
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

export const SyncSettings = ({}) => {
  const { data, isLoading, isError } = useHost.utils.settings();
  const { mutate, isLoading: isSaving } = useHost.sync.update();
  const { mutateAsync: serverRestart } = useHost.utils.restart();
  const t = useTranslation('common');
  const [syncSettings, setSyncSettings] = useState<SyncSettings | null>(null);
  const { success, info } = useNotification();

  const currentSettings = {
    centralServerSiteId: data?.syncSettings?.centralServerSiteId || 1,
    intervalSec: data?.syncSettings?.intervalSec || 10,
    password: '',
    url: data?.syncSettings?.url || '',
    username: data?.syncSettings?.username || '',
  };
  const settings = data?.syncSettings
    ? { ...currentSettings, ...syncSettings }
    : undefined;

  const onSave = () => {
    if (!syncSettings) return;
    const successSnack = success(t('success.sync-settings'));
    const restart = async () => {
      successSnack();
      await serverRestart(); // returns 'Restarting'
      const infoSnack = info(t('info.server-restarting'));
      infoSnack();
    };
    mutate(syncSettings, { onSuccess: restart });
  };

  return (
    <Grid container>
      <Typography variant="h5" color="primary" style={{ paddingBottom: 25 }}>
        {t('heading.settings-sync')}
      </Typography>
      {isLoading ? (
        <Grid item justifyContent="center" width="100%" display="flex">
          <CircularProgress size={20} />
        </Grid>
      ) : (
        <SyncSettingsForm
          setSyncSettings={setSyncSettings}
          isDisabled={isError}
          isSaving={isSaving}
          isValid={isValid(syncSettings)}
          settings={settings}
          onSave={onSave}
        />
      )}
    </Grid>
  );
};
