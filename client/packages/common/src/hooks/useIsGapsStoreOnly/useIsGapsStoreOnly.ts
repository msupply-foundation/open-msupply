import { useIsScreen } from "../useIsScreen";

// TODO: Add functionality to check store for 'GAPS Only' setting

export const useIsGapsStoreOnly = (): boolean => {
  return useIsScreen('sm');
};