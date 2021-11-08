import { useIsScreen } from './useIsScreen';

export const useIsMediumScreen = (): boolean => {
  return useIsScreen('lg');
};
