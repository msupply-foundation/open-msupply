import {
  Theme as MuiTheme,
  ThemeOptions as MuiThemeOptions,
} from '@material-ui/core/styles';
import createTheme from '@material-ui/core/styles/createTheme';
import {
  PaletteOptions as MuiPaletteOptions,
  TypeBackground as MuiTypeBackground,
} from '@material-ui/core/styles/createPalette';

type Modify<T, R> = Omit<T, keyof R> & R;

export type TypeBackground = Modify<
  MuiTypeBackground,
  {
    drawer: string;
  }
>;

export type PaletteOptions = Modify<
  MuiPaletteOptions,
  {
    background?: Partial<TypeBackground>;
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
    primary: { 500: '#e95c30' },
    background: {
      drawer: '#f2f2f5',
    },
  },
};

const theme = createTheme(themeOptions);

export default theme;
