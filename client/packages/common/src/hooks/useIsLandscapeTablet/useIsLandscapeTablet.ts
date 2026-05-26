import { useMediaQuery } from '@common/styles';

export const useIsLandscapeTablet = () =>
  useMediaQuery('(orientation: landscape) and (max-height: 800px)');
