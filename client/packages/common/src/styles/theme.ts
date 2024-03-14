import {
  createTheme as createMuiTheme,
  Direction,
  ThemeOptions,
} from '@mui/material/styles';

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
    drawer: {
      iconColor?: string;
      selectedBackgroundColor?: string;
      hoverBackgroundColor?: string;
      hoverTextColor?: string;
      textColor?: string;
    };
    gradient: {
      primary: string;
      secondary: string;
      size?: string;
      tertiary: string;
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
    outline: true;
  }
}

declare module '@mui/material/Switch' {
  export interface SwitchPropsColorOverrides {
    gray: true;
  }
}

declare module '@mui/material/styles/zIndex' {
  interface ZIndex {
    tableHeader: number;
  }
}

declare module '@mui/material/styles/createPalette' {
  interface Palette {
    border: string;
    cceStatus: {
      decomissioned: string;
      functioning: string;
      functioningButNeedsAttention: string;
      notFunctioning: string;
      notInUse: string;
      text: string;
    };
    chart: {
      cold: PaletteColor;
      hot: PaletteColor;
      lines: string[];
    };
    drawerDivider: string;
    gray: PaletteColor & { pale: string };
    outline: Palette['primary'];
    form: TypeForm;
  }
  interface TypeBackground {
    drawer: string;
    menu: string;
    toolbar: string;
    white: string;
    login: string;
  }

  interface TypeForm {
    field: string;
    label: string;
  }
}

declare module '@mui/material/styles/createTypography' {
  interface Typography {
    login: CSSProperties;
    th: CSSProperties;
  }
}

export const themeOptions = {
  breakpoints: {
    values: {
      xs: 0,
      sm: 601,
      md: 1025,
      lg: 1441,
      xl: 1537,
    },
  },
  direction: 'ltr' as Direction,
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
    drawer: {
      selectedBackgroundColor: '#fff',
      hoverBackgroundColor: '#fafafc',
    },
    saveButtonRow: { height: 40 },
    footer: { height: 32 },
    gradient: {
      primary: 'linear-gradient(156deg, #f80 4%, #e63535 96%)',
      secondary: 'linear-gradient(156deg, #78a3fc 4%, #3e7bfa 96%)',
      tertiary: 'linear-gradient(156deg, #e63535 4%, #78a3fc 96%)',
    },
    header: { backgroundColor: '#fafafc', borderBottom: '1px solid #cbced4' },
    icon: { medium: { height: 20, width: 20 } },
    table: {
      dataRow: { height: 40 },
      headerRow: { height: 60 },
      paginationRow: { height: 48 },
    },
  },
  palette: {
    outline: { main: '#555770' },
    divider: '#eaeaea',
    drawerDivider: '#eaeaea',
    error: { main: '#e63535' },
    gray: {
      main: '#8f90a6',
      light: '#c7c9d9',
      dark: '#555770',
      pale: '#ccddff',
    },
    border: '#e4e4eb',
    primary: {
      main: '#e95c30',
      light: '#ed7d59',
      dark: '#c43c11',
      contrastText: '#fff',
    },
    secondary: { main: '#3e7bfa', light: '#5b8def', dark: '#3568d4' },
    background: {
      drawer: '#f2f2f5',
      menu: '#f2f2f5',
      toolbar: '#fafafc',
      white: '#fff',
      login: '#f2f2f5',
    },

    form: {
      field: '#555770',
      label: '#28293d',
    },
    info: { main: '#3e7bfa', light: '#3e7bfa', dark: '#3568d4' },
    chart: {
      cold: { main: '#aacae2', light: '#d9edfa' },
      hot: { main: '#db6974', light: '#fbe2e4' },
      lines: ['#EED600', '#922DD0', '#E1A200', '#59639C', '#E500EA', '#00DBCE'],
    },
    cceStatus: {
      decomissioned: '#323232',
      functioning: '#69a607',
      functioningButNeedsAttention: '#f2a001',
      notFunctioning: '#de0001',
      notInUse: '#b0b0b0',
      text: '#fff',
    },
  },
  zIndex: {
    tableHeader: 1000,

    // Defaults below. Pasted here for convenience!
    mobileStepper: 1000,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },
  typography: {
    body1: {
      fontFamily: 'Inter Variable',
      fontSize: 14,
      lineHeight: 1.71,
      color: '#1c1c28',
    },
    body2: { color: '#555770', fontSize: 12, fontWeight: 500 },
    fontFamily: 'Inter Variable',
    th: { color: '#1c1c28', fontSize: 14, fontWeight: 700 },
    h6: {
      fontFamily: 'Inter Variable',
      fontSize: 16,
      color: '#555770',
    },
    subtitle1: { fontSize: '1.2em' },
    // Custom text variants
    login: { color: '#fafafa' },
  },
};

export const createTheme = (themeOptions: ThemeOptions) => {
  const theme = createMuiTheme(themeOptions);

  theme.shadows[1] =
    '0 0.5px 2px 0 rgba(96, 97, 112, 0.16), 0 0 1px 0 rgba(40, 41, 61, 0.08)';
  theme.shadows[2] =
    '0 4px 8px 0 rgba(96, 97, 112, 0.16), 0 0 2px 0 rgba(40, 41, 61, 0.04)';
  theme.shadows[3] =
    '0 8px 16px 0 rgba(96, 97, 112, 0.16), 0 2px 4px 0 rgba(40, 41, 61, 0.04)';
  return theme;
};
