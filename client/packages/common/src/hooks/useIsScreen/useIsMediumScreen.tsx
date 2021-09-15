import { useMediaQuery, useTheme } from '@material-ui/core';

export const useIsMediumScreen = (): boolean => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('lg'));
};
