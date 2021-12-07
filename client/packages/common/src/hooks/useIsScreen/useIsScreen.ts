import { useMediaQuery, Breakpoint } from '@mui/material';
import { useAppTheme } from '@common/styles';

export const useIsScreen = (breakpoint: Breakpoint): boolean => {
  const theme = useAppTheme();
  return useMediaQuery(theme.breakpoints.down(breakpoint));
};
