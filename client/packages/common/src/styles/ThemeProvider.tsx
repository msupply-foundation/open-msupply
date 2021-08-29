import React from 'react';
import { ThemeProvider as MuiThemeProvider, Theme } from '@material-ui/core';
import { StyledEngineProvider } from '@material-ui/core/styles';
import theme from './theme';

declare module '@material-ui/styles/defaultTheme' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DefaultTheme extends Theme {}
}

const ThemeProvider: React.FC = ({ children }) => (
  <StyledEngineProvider injectFirst>
    <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
  </StyledEngineProvider>
);

export default ThemeProvider;
