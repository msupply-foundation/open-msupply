import { useMediaQuery, useTheme } from '@material-ui/core';

export const useIsExtraLargeScreen = (): boolean => {
  const theme = useTheme();

  return useMediaQuery(theme.breakpoints.up('xl'));
};
