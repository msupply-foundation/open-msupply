import { useMediaQuery, useTheme } from '@material-ui/core';

export const useIsLargeScreen = (): boolean => {
  const theme = useTheme();

  return useMediaQuery(theme.breakpoints.down('xl'));
};
