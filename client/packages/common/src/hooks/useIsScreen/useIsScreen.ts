import { useMediaQuery, Breakpoint } from '@mui/material';
import { useAppTheme } from './../../styles/useAppTheme';

export { Breakpoint } from '@mui/material';

export const useIsScreen = (breakpoint: Breakpoint): boolean => {
  const theme = useAppTheme();
  return useMediaQuery(theme.breakpoints.down(breakpoint));
};
