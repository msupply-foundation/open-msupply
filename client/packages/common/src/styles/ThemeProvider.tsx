import React from 'react';
import { ThemeProvider as MuiThemeProvider, Theme } from '@material-ui/core';
import { CacheProvider } from '@emotion/react';
import { StyledEngineProvider } from '@material-ui/core/styles';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { useAppTheme } from './useAppTheme';
import { RTLProvider } from './RTLProvider';

const cacheRtl = createCache({
  key: 'rtl',
  // The type for rtlPlugin is incorrect and I can't make it play nice.
  // Since we only need to pass the reference to this array and aren't
  // using it within any other user code, it seems safe enough to
  // cast to the reference to `any`, walk away and pretend nothing happened.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stylisPlugins: [rtlPlugin as any],
});

declare module '@material-ui/styles/defaultTheme' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DefaultTheme extends Theme {}
}

const ThemeProvider: React.FC = ({ children }) => {
  const appTheme = useAppTheme();

  return (
    <CacheProvider value={cacheRtl}>
      <StyledEngineProvider injectFirst>
        <RTLProvider>
          <MuiThemeProvider theme={appTheme}>{children}</MuiThemeProvider>
        </RTLProvider>
      </StyledEngineProvider>
    </CacheProvider>
  );
};

export default ThemeProvider;
