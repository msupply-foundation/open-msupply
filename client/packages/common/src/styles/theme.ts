import { createTheme, Direction } from '@mui/material/styles';

/**
 * Our theme uses module augmentation when customising the theme to ensure
 * types are correct throughout the app.
 *
 * See: https://material-ui.com/guides/typescript/#customization-of-theme
 */

declare module '@mui/material/styles/createMixins' {
  interface Mixins {
    header: {
      backgroundColor: string;
      borderBottom: string;
    };
    dialog: {
      button: {
        iconHeight: number;
        iconWidth: number;
        primary: {
          backgroundColor: string;
          color: string;
        };
        secondary: {
          backgroundColor: string;
          color: string;
        };
      };
    };
    icon: {
      medium: { width: number; height: number };
    };
    saveButtonRow: {
      height: number;
    };
    footer: {
      height: number;
    };
    table: {
      dataRow: { height: number };
      headerRow: { height: number };
      paginationRow: { height: number };
    };
  }
}

declare module '@mui/material/Checkbox' {
  export interface CheckboxPropsColorOverrides {
    darkGrey: true;
  }
}

declare module '@mui/material/styles' {
  interface Palette {
    darkGrey: Palette['primary'];
  }
  interface PaletteOptions {
    darkGrey: PaletteOptions['primary'];
  }
}

declare module '@mui/material/styles/createPalette' {
  interface Palette {
    border: string;
    darkGrey: Palette['primary'];
    lightGrey: string;
    midGrey: string;
    form: TypeForm;
  }
  interface TypeBackground {
    menu: string;
    toolbar: string;
    white: string;
  }

  interface TypeForm {
    field: string;
    label: string;
  }
}

declare module '@mui/material/styles/createTypography' {
  interface Typography {
    th: CSSProperties;
  }
}

const themeOptions = {
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 1024,
      lg: 1440,
      xl: 1536,
    },
  },
  direction: 'rtl' as Direction,
  mixins: {
    dialog: {
      button: {
        iconHeight: 16,
        iconWidth: 16,
        primary: {
          backgroundColor: '#3e7bfa',
          color: '#fff',
        },
        secondary: {
          backgroundColor: '#fff',
          color: '#3e7bfa',
        },
      },
    },
    saveButtonRow: { height: 40 },
    footer: { height: 32 },
    header: { backgroundColor: '#fafafc', borderBottom: '1px solid #cbced4' },
    icon: { medium: { height: 20, width: 20 } },
    table: {
      dataRow: { height: 40 },
      headerRow: { height: 60 },
      paginationRow: { height: 48 },
    },
  },
  palette: {
    darkGrey: { main: '#555770' },
    divider: '#eaeaea',
    error: { main: '#e63535' },
    lightGrey: '#c7c9d9',
    midGrey: '#8f90a6',
    border: '#e4e4eb',
    primary: { 500: '#e95c30' },
    secondary: { main: '#3e7bfa' },

    background: {
      menu: '#f2f2f5',
      toolbar: '#fafafc',
      white: '#fff',
    },

    form: {
      field: '#555770',
      label: '#28293d',
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
