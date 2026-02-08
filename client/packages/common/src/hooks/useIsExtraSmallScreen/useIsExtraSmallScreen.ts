import { useAppTheme, useMediaQuery, Breakpoints } from '@common/styles';

export const useIsExtraSmallScreen = (): boolean => {
  const theme = useAppTheme();
  const isExtraSmallScreen = useMediaQuery(theme.breakpoints.down(Breakpoints.sm));

  return isExtraSmallScreen;
};
