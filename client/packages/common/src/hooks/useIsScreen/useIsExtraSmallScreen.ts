import { useIsScreen } from './useIsScreen';

export const useIsExtraSmallScreen = (): boolean => {
  return useIsScreen('sm');
};
