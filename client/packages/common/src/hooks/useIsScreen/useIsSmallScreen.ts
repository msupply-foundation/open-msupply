import { useIsScreen } from './useIsScreen';

export const useIsSmallScreen = (): boolean => {
  return useIsScreen('md');
};
