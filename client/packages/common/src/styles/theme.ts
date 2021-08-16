import { createTheme } from '@material-ui/core/styles';

declare module '@material-ui/core/styles/createMixins' {
  interface Mixins {
    icon: {
      medium: { width: number; height: number };
    };
  }
}

declare module '@material-ui/core/styles/createPalette' {
  interface TypeBackground {
    drawer: string;
    white: string;
  }
}

const themeOptions = {
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
    fontFamily: 'Inter',
    h6: {
      fontFamily: 'Inter',
      fontSize: 16,
      color: '#555770',
    },
  },
};

const theme = createTheme(themeOptions);

export default theme;
