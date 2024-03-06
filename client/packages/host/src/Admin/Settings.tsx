import React from 'react';

import {
  Grid,
  TranslateIcon,
  Typography,
  useLocalStorage,
  useNavigate,
  useTranslation,
  useNotification,
  UserPermission,
  usePermissionCheck,
  LocalStorage,
  useInitialisationStatus,
} from '@openmsupply-client/common';
import { themeOptions } from '@common/styles';

import { AppVersion, LanguageMenu } from '../components';
import { Setting } from './Setting';
import { SettingTextArea, TextValue } from './SettingTextArea';
import { SyncSettings } from './SyncSettings';
import { useHost } from '../api';
import { SiteInfo } from '../components/SiteInfo';
import { ServerSettings } from './ServerSettings';
import { ElectronSettings } from './ElectronSettings';

export const Settings: React.FC = () => {
  const t = useTranslation();
  const { error } = useNotification();
  const navigate = useNavigate();
  const [customTheme, setCustomTheme] = useLocalStorage('/theme/custom');
  const [customLogo, setCustomLogo] = useLocalStorage('/theme/logo');
  const { mutate: updateSettings } = useHost.settings.updateDisplaySettings();
  usePermissionCheck(UserPermission.ServerAdmin);
  const customThemeEnabled =
    !!customTheme && Object.keys(customTheme).length > 0;
  const { data: initStatus } = useInitialisationStatus();

  const customThemeValue = {
    enabled: customThemeEnabled,
    text: JSON.stringify(
      customThemeEnabled ? customTheme : themeOptions,
      null,
      4
    ),
  };

  const customLogoValue = {
    enabled: !!customLogo,
    text: customLogo ?? '',
  };

  const updateTheme = (customTheme: string) => {
    updateSettings(
      { customTheme },
      {
        onSuccess: updateResult => {
          if (
            updateResult.__typename === 'UpdateResult' &&
            !!updateResult.theme
          )
            LocalStorage.setItem('/theme/customhash', updateResult.theme);
          navigate(0);
        },
      }
    );
  };

  const saveTheme = (value: TextValue) => {
    if (!value.text) return;

    try {
      const themeOptions = JSON.parse(value.text);
      setCustomTheme(themeOptions);
      updateTheme(value.text);
    } catch (e) {
      error(`${t('error.something-wrong')} ${(e as Error).message}`)();
    }
  };

  const onToggleCustomTheme = (checked: boolean) => {
    if (!checked) {
      setCustomTheme({});
      updateTheme('');
      LocalStorage.setItem('/theme/customhash', '');
    }
  };

  const saveLogo = (value: TextValue) => {
    if (!value.text) return;
    try {
      setCustomLogo(value.text);
      updateSettings(
        { customLogo: value.text },
        {
          onSuccess: updateResult => {
            if (
              updateResult.__typename === 'UpdateResult' &&
              !!updateResult.logo
            )
              LocalStorage.setItem('/theme/logohash', updateResult.logo);
          },
        }
      );
    } catch (e) {
      error(`${t('error.something-wrong')} ${(e as Error).message}`)();
    }
  };

  const onToggleCustomLogo = (checked: boolean) => {
    if (!checked) {
      setCustomLogo('');
      LocalStorage.setItem('/theme/logohash', '');
      updateSettings({ customLogo: '' });
    }
  };

  return (
    <Grid display="flex" flexDirection="column" flex={1}>
      <Grid
        container
        flexDirection="column"
        justifyContent="flex-start"
        style={{ padding: 15, width: 500 }}
        flexWrap="nowrap"
      >
        <Typography variant="h5" color="primary" style={{ paddingBottom: 25 }}>
          {t('heading.settings-display')}
        </Typography>
        <Setting
          component={<LanguageMenu />}
          title={t('button.language')}
          icon={<TranslateIcon />}
        />
        <SettingTextArea
          defaultValue={customThemeValue}
          onSave={saveTheme}
          onToggle={onToggleCustomTheme}
          title={t('heading.custom-theme')}
        />
        <SettingTextArea
          defaultValue={customLogoValue}
          onSave={saveLogo}
          onToggle={onToggleCustomLogo}
          infoText={t('heading.custom-logo-info')}
          title={t('heading.custom-logo')}
        />
        <SyncSettings />
        <ServerSettings />
        <ElectronSettings />
      </Grid>
      <AppVersion SiteInfo={<SiteInfo siteName={initStatus?.siteName} />} />
    </Grid>
  );
};
