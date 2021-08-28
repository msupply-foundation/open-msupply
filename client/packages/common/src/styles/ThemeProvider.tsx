import React from 'react';
import {
  ThemeProvider as MuiThemeProvider,
  StyledEngineProvider,
} from '@material-ui/core/styles';
import { Theme } from '@material-ui/core/styles/createTheme';
// import { ThemeProvider as MuiThemeProvider } from '@material-ui/styles';
import theme from './theme';

declare module '@material-ui/styles/defaultTheme' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DefaultTheme extends Theme {
    josh: string;
  }
}

const ThemeProvider: React.FC = ({ children }) => (
  <StyledEngineProvider injectFirst>
    <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
  </StyledEngineProvider>
);

export default ThemeProvider;
