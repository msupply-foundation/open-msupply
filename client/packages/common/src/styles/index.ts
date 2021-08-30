import { AppGlobalStyles } from './AppGlobalStyles';
import { useRtl, useAppTheme } from './hooks';
import AppThemeProvider from './ThemeProvider';
import { styled } from '@material-ui/core/styles';
import { useTheme } from '@material-ui/core/styles';
import makeStyles from '@material-ui/styles/makeStyles';
import CssBaseline from '@material-ui/core/CssBaseline';
import useMediaQuery from '@material-ui/core/useMediaQuery';

export {
  AppThemeProvider,
  makeStyles,
  CssBaseline,
  styled,
  useMediaQuery,
  useTheme,
  useRtl,
  useAppTheme,
  AppGlobalStyles,
};
