import React from 'react';
import { ThemeProvider as MuiThemeProvider, Theme } from '@material-ui/core';
import { CacheProvider } from '@emotion/react';
import { StyledEngineProvider } from '@material-ui/core/styles';
import createCache from '@emotion/cache';
import theme from './theme';
import rtlPlugin from 'stylis-plugin-rtl';

const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [rtlPlugin as any],
});

declare module '@material-ui/styles/defaultTheme' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DefaultTheme extends Theme {}
}

const ThemeProvider: React.FC = ({ children }) => (
  <CacheProvider value={cacheRtl}>
    <StyledEngineProvider injectFirst>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </StyledEngineProvider>
  </CacheProvider>
);

export default ThemeProvider;
