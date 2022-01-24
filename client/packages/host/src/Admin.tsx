import React, { ChangeEvent } from 'react';

import {
  ButtonWithIcon,
  Grid,
  SaveIcon,
  Switch,
  TextArea,
  TranslateIcon,
  Typography,
  useAppTheme,
  useLocalStorage,
  useNavigate,
  useTranslation,
} from '@openmsupply-client/common';
import { LanguageMenu } from './components';

interface SettingProps {
  component: JSX.Element;
  icon?: JSX.Element;
  title: string;
}

export const Setting: React.FC<SettingProps> = ({ component, icon, title }) => {
  return (
    <Grid container style={{ paddingBottom: 15 }}>
      <Grid item style={{ width: 50, display: 'flex' }} justifyContent="center">
        {icon}
      </Grid>
      <Grid item flexShrink={0} flexGrow={1}>
        <Typography style={{ fontSize: 16 }}>{title}</Typography>
      </Grid>
      <Grid item>{component}</Grid>
    </Grid>
  );
};
export const Admin: React.FC = () => {
  const t = useTranslation('common');
  const navigate = useNavigate();
  //   const { theme } = useAppTheme();
  const [customTheme, setCustomTheme] = useLocalStorage('/theme/custom');
  const [themeText, setThemeText] = React.useState(
    customTheme ? JSON.stringify(customTheme, null, 4) : '{}'
  );
  const [isCustomTheme, setIsCustomTheme] = React.useState(!!customTheme);

  const updateThemeText = (event: ChangeEvent<HTMLTextAreaElement>) => {
    // console.info('setting it to ', event.target.value || '');
    setThemeText(event.target.value || '');
  };

  const saveTheme = () => {
    console.info('** === **', themeText);
    if (!themeText) return;
    try {
      const themeOptions = JSON.parse(themeText);
      setCustomTheme(themeOptions);
      console.info('** set custom theme to **', themeOptions);
      //   setTheme(themeOptions);
      navigate(0);
    } catch {
      alert('oh dear');
    }
  };

  const handleCustomThemeChange = (
    _: React.SyntheticEvent<Element, Event>,
    checked: boolean
  ) => {
    if (!checked) {
      setCustomTheme(null);
    }
    setIsCustomTheme(checked);
  };

  return (
    <Grid
      container
      flexDirection="column"
      justifyContent="flex-start"
      style={{ padding: 15, width: 500 }}
    >
      <Typography variant="h5" color="primary" style={{ paddingBottom: 25 }}>
        Settings
      </Typography>
      <Setting
        component={<LanguageMenu />}
        title="Language"
        icon={<TranslateIcon />}
      />
      <Setting
        component={
          <Switch checked={isCustomTheme} onChange={handleCustomThemeChange} />
        }
        title="Custom theme"
      />
      {isCustomTheme && (
        <Grid container flexDirection="column" alignItems="flex-end">
          <Grid
            item
            sx={{
              marginBottom: '5px',
              width: '100%',
            }}
            flex={1}
          >
            <TextArea
              onChange={updateThemeText}
              value={themeText}
              maxRows={10}
              minRows={10}
              style={{ padding: '0 0 0 50px' }}
              inputProps={{
                sx: {
                  borderColor: 'gray.main',
                  borderStyle: 'solid',
                  borderWidth: '1px',
                  borderRadius: '5px',
                  padding: '3px',
                },
              }}
            />
          </Grid>
          <Grid item>
            <ButtonWithIcon
              Icon={<SaveIcon />}
              label={t('button.save')}
              variant="contained"
              sx={{ fontSize: '12px' }}
              onClick={saveTheme}
            />
          </Grid>
        </Grid>
      )}
    </Grid>
  );
};
