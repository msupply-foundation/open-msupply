import React from 'react';

import {
  Grid,
  TranslateIcon,
  Typography,
  useLocalStorage,
  useNavigate,
  useTranslation,
  useNotification,
} from '@openmsupply-client/common';
import { themeOptions } from '@common/styles';
import { LanguageMenu } from '../components';
import { Setting } from './Setting';
import { SettingTextArea, TextValue } from './SettingTextArea';
import packageJson from 'package.json';
import { useApiVersion } from '../api/hooks';

export const Settings: React.FC = () => {
  const t = useTranslation('common');
  const { error } = useNotification();
  const navigate = useNavigate();
  const [customTheme, setCustomTheme] = useLocalStorage('/theme/custom');
  const [customLogo, setCustomLogo] = useLocalStorage('/theme/logo');
  const { data } = useApiVersion();
  const customThemeEnabled =
    !!customTheme && Object.keys(customTheme).length > 0;

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

  const saveTheme = (value: TextValue) => {
    if (!value.text) return;
    try {
      const themeOptions = JSON.parse(value.text);
      setCustomTheme(themeOptions);
      navigate(0);
    } catch (e) {
      error(`${t('error.something-wrong')} ${(e as Error).message}`)();
    }
  };

  const onToggleCustomTheme = (checked: boolean) => {
    if (!checked) {
      setCustomTheme({});
    }
  };

  const saveLogo = (value: TextValue) => {
    if (!value.text) return;
    try {
      setCustomLogo(value.text);
      //      navigate(0);
    } catch (e) {
      error(`${t('error.something-wrong')} ${(e as Error).message}`)();
    }
  };

  const onToggleCustomLogo = (checked: boolean) => {
    if (!checked) {
      setCustomLogo('');
    }
  };

  console.log('version', data);

  return (
    <Grid
      container
      flexDirection="column"
      justifyContent="flex-start"
      style={{ padding: 15, width: 500 }}
      flexWrap="nowrap"
    >
      <Typography variant="h5" color="primary" style={{ paddingBottom: 25 }}>
        {t('heading.settings')}
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
        title={t('heading.custom-logo')}
      />
      <Grid style={{ position: 'absolute', right: 0, bottom: 30 }}>
        <Grid container padding={1} flexDirection="column">
          <Grid item display="flex" flex={1} gap={1}>
            <Grid item justifyContent="flex-end" flex={1} display="flex">
              <Typography fontWeight={700} whiteSpace="nowrap">
                App version:
              </Typography>
            </Grid>
            <Grid item flex={1}>
              <Typography>{packageJson.version}</Typography>
            </Grid>
          </Grid>
          {!!data && (
            <Grid item display="flex" flex={1} gap={1}>
              <Grid item justifyContent="flex-end" flex={1} display="flex">
                <Typography fontWeight={700} whiteSpace="nowrap">
                  API version:
                </Typography>
              </Grid>
              <Grid item flex={1}>
                <Typography>{data}</Typography>
              </Grid>
            </Grid>
          )}
        </Grid>
      </Grid>
    </Grid>
  );
};
