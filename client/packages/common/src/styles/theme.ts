import { createTheme } from '@material-ui/core/styles';
import shadows, { Shadows } from '@material-ui/core/styles/shadows';
import { CSSProperties } from 'react';

declare module '@material-ui/core/styles/createMixins' {
  interface Mixins {
    header: {
      backgroundColor: string;
      borderBottom: string;
    };
    icon: {
      medium: { width: number; height: number };
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
  mixins: {
    header: { backgroundColor: '#fafafc', borderBottom: '1px solid #cbced4' },
    icon: { medium: { height: 20, width: 20 } },
  },
  palette: {
    darkGrey: '#555770',
    primary: { 500: '#e95c30' },
    background: {
      menu: '#f2f2f5',
      white: '#fff',
    },
  },
  shadows: [
    'none',
    '0 4px 8px 0 rgba(96, 97, 112, 0.16), 0 0 2px 0 rgba(40, 41, 61, 0.04)',
    ...shadows.slice(2),
  ] as Shadows,
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

export default theme;
