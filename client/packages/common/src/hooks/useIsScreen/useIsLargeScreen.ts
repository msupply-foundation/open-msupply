import { useMediaQuery, useTheme } from '@mui/material';

export const useIsLargeScreen = (): boolean => {
  const theme = useTheme();

  return useMediaQuery(theme.breakpoints.down('xl'));
};
