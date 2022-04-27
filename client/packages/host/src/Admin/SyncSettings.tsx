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

export interface SyncSettingProps {
  property: keyof SyncSettings;
  settings?: SyncSettings;
  type?: string;
  update: (syncSettings: SyncSettings) => void;
}

const StringSyncSetting: FC<SyncSettingProps> = ({
  property,
  settings,
  update,
  type = 'text',
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
    />
  );
};

const NumericSyncSetting: FC<SyncSettingProps> = ({
  property,
  settings,
  update,
}) => {
  const value = settings?.[property] || '';
  const onChange = (value: string) => {
    const patched = { ...settings, [property]: Number(value) } as SyncSettings;
    update(patched);
  };
  return (
    <NumericTextInput value={value} onChange={e => onChange(e.target.value)} />
  );
};

const isValid = (syncSettings: SyncSettings | null) => {
  if (!syncSettings) return false;
  return (
    !!syncSettings.url &&
    !!syncSettings.username &&
    !!syncSettings.password &&
    !!syncSettings.intervalSec &&
    !!syncSettings.centralServerSiteId &&
    !!syncSettings.siteId
  );
};

const SyncSettingsForm = ({
  isSaving,
  isValid,
  settings,
  onSave,
  setSyncSettings,
}: {
  isSaving: boolean;
  isValid: boolean;
  settings?: SyncSettings;
  onSave: () => void;
  setSyncSettings: (syncSettings: SyncSettings) => void;
}) => {
  const t = useTranslation('common');
  return (
    <>
      <Setting
        title={t('label.settings-url')}
        component={
          <StringSyncSetting
            property="url"
            settings={settings}
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
            update={setSyncSettings}
          />
        }
      />
      <Setting
        title={t('label.settings-password')}
        component={
          <StringSyncSetting
            property="password"
            settings={settings}
            update={setSyncSettings}
            type="password"
          />
        }
      />
      <Setting
        title={t('label.settings-interval')}
        component={
          <NumericSyncSetting
            property="intervalSec"
            settings={settings}
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
            update={setSyncSettings}
          />
        }
      />
      <Setting
        title={t('label.settings-site-id')}
        component={
          <NumericSyncSetting
            property="siteId"
            settings={settings}
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
    </>
  );
};

export const SyncSettings = ({}) => {
  const { data, isLoading } = useHost.utils.settings();
  const { mutate, isLoading: isSaving } = useHost.sync.update();
  const t = useTranslation('common');
  const [syncSettings, setSyncSettings] = useState<SyncSettings | null>(null);
  const { success } = useNotification();

  const currentSettings = {
    centralServerSiteId: data?.syncSettings?.centralServerSiteId || 1,
    intervalSec: data?.syncSettings?.intervalSec || 10,
    password: '',
    siteHardwareId: data?.syncSettings?.siteHardwareId || '',
    siteId: data?.syncSettings?.siteId || 2,
    url: data?.syncSettings?.url || '',
    username: data?.syncSettings?.username || '',
  };
  const settings = data?.syncSettings
    ? { ...currentSettings, ...syncSettings }
    : undefined;

  const onSave = () => {
    if (!syncSettings) return;
    const successSnack = success(t('success.sync-settings'));
    mutate(syncSettings, { onSuccess: successSnack });
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
          isSaving={isSaving}
          isValid={isValid(syncSettings)}
          settings={settings}
          onSave={onSave}
        />
      )}
    </Grid>
  );
};
