import { MixinsOptions as MuiMixinsOptions } from '@material-ui/core/styles/createMixins';
import {
  createTheme,
  Theme as MuiTheme,
  ThemeOptions as MuiThemeOptions,
} from '@material-ui/core';

import {
  PaletteOptions as MuiPaletteOptions,
  TypeBackground as MuiTypeBackground,
} from '@material-ui/core/styles/createPalette';
import { CSSProperties } from '@material-ui/core/styles/withStyles';

type Modify<T, R> = Omit<T, keyof R> & R;

export type TypeBackground = Modify<
  MuiTypeBackground,
  {
    drawer: string;
    white: string;
  }
>;

export type MixinsOptions = Modify<
  MuiMixinsOptions,
  {
    icon: {
      large?: CSSProperties;
      medium?: CSSProperties;
      small?: CSSProperties;
    };
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
    mixins: MixinsOptions;
    palette: PaletteOptions;
  }
>;

export type ApplicationTheme = Modify<
  MuiTheme,
  {
    mixins: MixinsOptions;
    palette: PaletteOptions;
  }
>;

const themeOptions: ThemeOptions = {
  mixins: { icon: { medium: { height: 20, width: 20 } } },
  palette: {
    primary: { 500: '#e95c30' },
    background: {
      drawer: '#f2f2f5',
      white: '#fff',
    },
  },
  typography: {
    body1: {
      fontFamily: 'Inter',
      fontSize: 14,
      lineHeight: 1.71,
      color: '#1c1c28',
    },
  },
};

const theme = createTheme(themeOptions);

export default theme;
