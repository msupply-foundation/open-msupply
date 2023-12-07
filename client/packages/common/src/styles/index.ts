import { RTLProvider } from './RTLProvider';
import { useAppTheme } from './useAppTheme';
import AppThemeProvider, { ThemeProviderProxy } from './ThemeProvider';
import { styled, Theme, useTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, SxProps } from '@mui/material/styles';

// This type allows you to create an item to be passed to
// some Mui `sx` prop.
type AppSxProp = SxProps<ReturnType<typeof useAppTheme>>;

export { themeOptions } from './theme';
export {
  AppSxProp,
  alpha,
  AppThemeProvider,
  CssBaseline,
  RTLProvider,
  Theme,
  SxProps,
  styled,
  ThemeProviderProxy,
  useAppTheme,
  useMediaQuery,
  useTheme,
};
