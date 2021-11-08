import { useTheme, useMediaQuery } from '@mui/material';

export const useIsExtraLargeScreen = (): boolean => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up('xl'));
};
