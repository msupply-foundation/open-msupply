import { useMediaQuery, useTheme } from '@mui/material';

export const useIsMediumScreen = (): boolean => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('lg'));
};
