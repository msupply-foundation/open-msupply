import React, { FC } from 'react';
import { CacheProvider } from '@emotion/react';
import { ThemeProviderProps } from '@mui/material/styles/ThemeProvider';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { useAppTheme } from './useAppTheme';
import { RTLProvider } from './RTLProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider/LocalizationProvider';
import { PropsWithChildrenOnly } from '@common/types';
import { createRegisteredContext } from 'react-singleton-context';
import { useIntlUtils } from '@common/intl';

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

const ThemeContext = createRegisteredContext<ThemeProviderProps>('mui-theme', {
  theme: {},
});

export const ThemeProviderProxy: FC<PropsWithChildrenOnly> = ({ children }) => {
  const { theme } = React.useContext(ThemeContext);

  return <MuiThemeProvider theme={theme}>{children} </MuiThemeProvider>;
};

const ThemeProvider: FC<PropsWithChildrenOnly> = ({ children }) => {
  const appTheme = useAppTheme();
  const { getLocale } = useIntlUtils();

  return (
    <LocalizationProvider
      dateAdapter={AdapterDateFns}
      adapterLocale={getLocale()}
    >
      <CacheProvider value={appTheme.direction === 'rtl' ? cacheRtl : cacheLtr}>
        <RTLProvider>
          <ThemeContext.Provider value={{ theme: appTheme }}>
            <ThemeProviderProxy>{children}</ThemeProviderProxy>
          </ThemeContext.Provider>
        </RTLProvider>
      </CacheProvider>
    </LocalizationProvider>
  );
};

export default ThemeProvider;
