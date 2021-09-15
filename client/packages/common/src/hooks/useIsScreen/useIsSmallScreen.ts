import { useMediaQuery, useTheme } from '@material-ui/core';

export const useIsSmallScreen = (): boolean => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('md'));
};
