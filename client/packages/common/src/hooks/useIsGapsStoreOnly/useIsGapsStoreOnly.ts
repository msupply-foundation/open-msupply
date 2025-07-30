import { useAppTheme, useMediaQuery, Breakpoints } from '@common/styles';
// TODO: Add functionality to check store for 'GAPS Only' setting
export const useIsGapsStoreOnly = (): boolean => {
  const theme = useAppTheme();
  const isGapsStoreOnly = useMediaQuery(theme.breakpoints.down(Breakpoints.sm));

  return isGapsStoreOnly;
};
