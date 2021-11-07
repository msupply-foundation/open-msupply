import { useIsScreen } from './useIsScreen';

export const useIsLargeScreen = (): boolean => {
  return useIsScreen('xl');
};
