import { Direction } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { themeOptions, createTheme } from './theme';
import { useRtl } from '@common/intl';
import { useLocalStorage } from '../localStorage';
import merge from 'lodash/merge';

export const useAppTheme = (): Theme => {
  const isRtl = useRtl();
  const [customTheme] = useLocalStorage('/theme/custom');
  const direction: Direction = isRtl ? 'rtl' : 'ltr';
  const rtlThemeOptions = { ...themeOptions, direction };
  const appTheme = customTheme
    ? createTheme(merge(rtlThemeOptions, customTheme))
    : createTheme(rtlThemeOptions);

  return appTheme;
};
