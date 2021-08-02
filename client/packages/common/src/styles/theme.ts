import {
  PaletteColorOptions,
  Theme as MuiTheme,
  ThemeOptions as MuiThemeOptions,
} from '@material-ui/core/styles';
import createTheme from '@material-ui/core/styles/createTheme';
import { PaletteOptions as MuiPaletteOptions } from '@material-ui/core/styles/createPalette';

type Modify<T, R> = Omit<T, keyof R> & R;

export type PaletteOptions = Modify<
  MuiPaletteOptions,
  {
    menuBackground: PaletteColorOptions;
  }
>;

export type ThemeOptions = Modify<
  MuiThemeOptions,
  {
    palette: PaletteOptions;
  }
>;

export type Theme = Modify<
  MuiTheme,
  {
    palette: PaletteOptions;
  }
>;

const themeOptions: ThemeOptions = {
  palette: {
    menuBackground: { main: '#f2f2f5' },
    primary: { 500: '#e95c2f' },
  },
};

const theme = createTheme(themeOptions);

export default theme;
