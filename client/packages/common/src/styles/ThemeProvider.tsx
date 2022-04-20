import React, { FC } from 'react';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { useAppTheme } from './useAppTheme';
import { RTLProvider } from './RTLProvider';
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import { PropsWithChildrenOnly } from '@common/types';

/**
 * Need a cache with the rtl plugin for when we are using rtl.
 * Don't want the plugin when using ltr.
 * Statically define each cache and switch between rather than memoizing
 * and adding the plugin within the react component.
 * https://material-ui.com/guides/right-to-left/
 */
const cacheLtr = createCache({
  key: 'rtl',
  stylisPlugins: [],
});

const cacheRtl = createCache({
  key: 'rtl',
  // The type for rtlPlugin is incorrect and I can't make it play nice.
  // Since we only need to pass the reference to this array and aren't
  // using it within any other user code, it seems safe enough to
  // cast to the reference to `any`, walk away and pretend nothing happened.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stylisPlugins: [rtlPlugin as any],
});

const ThemeProvider: FC<PropsWithChildrenOnly> = ({ children }) => {
  const appTheme = useAppTheme();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <CacheProvider value={appTheme.direction === 'rtl' ? cacheRtl : cacheLtr}>
        <RTLProvider>
          <MuiThemeProvider theme={appTheme}>{children}</MuiThemeProvider>
        </RTLProvider>
      </CacheProvider>
    </LocalizationProvider>
  );
};

export default ThemeProvider;
