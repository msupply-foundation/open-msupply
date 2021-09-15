import { createTheme, Direction } from '@material-ui/core/styles';

/**
 * Our theme uses module augmentation when customising the theme to ensure
 * types are correct throughout the app.
 *
 * See: https://material-ui.com/guides/typescript/#customization-of-theme
 */

declare module '@material-ui/core/styles/createMixins' {
  interface Mixins {
    header: {
      backgroundColor: string;
      borderBottom: string;
    };
    icon: {
      medium: { width: number; height: number };
    };
    table: {
      dataRow: { height: number };
      headerRow: { height: number };
      paginationRow: { height: number };
    };
  }
}

declare module '@material-ui/core/styles/createPalette' {
  interface Palette {
    darkGrey: string;
  }
  interface TypeBackground {
    menu: string;
    white: string;
  }
}

declare module '@material-ui/core/styles/createTypography' {
  interface Typography {
    th: CSSProperties;
  }
}

const themeOptions = {
  direction: 'rtl' as Direction,
  mixins: {
    header: { backgroundColor: '#fafafc', borderBottom: '1px solid #cbced4' },
    icon: { medium: { height: 20, width: 20 } },
    table: {
      dataRow: { height: 40 },
      headerRow: { height: 40 },
      paginationRow: { height: 32 },
    },
  },
  palette: {
    darkGrey: '#555770',
    primary: { 500: '#e95c30' },
    secondary: { main: '#555770' },

    background: {
      menu: '#f2f2f5',
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
    fontFamily: 'Inter',
    th: { color: '#1c1c28', fontSize: 14, fontWeight: 700 },
    h6: {
      fontFamily: 'Inter',
      fontSize: 16,
      color: '#555770',
    },
  },
};
const theme = createTheme(themeOptions);

theme.shadows[1] =
  '0 4px 8px 0 rgba(96, 97, 112, 0.16), 0 0 2px 0 rgba(40, 41, 61, 0.04)';
theme.shadows[2] =
  '0 8px 16px 0 rgba(96, 97, 112, 0.16), 0 2px 4px 0 rgba(40, 41, 61, 0.04)';

export default theme;
