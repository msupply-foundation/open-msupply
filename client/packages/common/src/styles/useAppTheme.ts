import { Direction, ThemeOptions } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { themeOptions, createTheme } from './theme';
import { useIntlUtils } from '@common/intl';
import { useLocalStorage } from '../localStorage';
import { merge } from '@common/utils';

export const useAppTheme = (): Theme => {
  const { isRtl } = useIntlUtils();
  const [customTheme] = useLocalStorage('/theme/custom');
  const direction: Direction = isRtl ? 'rtl' : 'ltr';
  const rtlThemeOptions = { ...themeOptions, direction } as ThemeOptions;
  const appTheme = customTheme
    ? createTheme(merge(rtlThemeOptions, customTheme))
    : createTheme(rtlThemeOptions);

  return appTheme;
};
