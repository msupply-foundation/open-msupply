import React from 'react';
import { ThemeProvider as MuiThemeProvider } from '@material-ui/core';
import theme from './theme';

const ThemeProvider: React.FC = ({ children }) => (
  <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
);

export default ThemeProvider;
