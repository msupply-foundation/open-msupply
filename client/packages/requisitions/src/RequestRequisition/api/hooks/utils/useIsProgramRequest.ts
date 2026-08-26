import { useRequest } from '../document/useRequest';

export const useIsProgramRequest = (): boolean => {
  const { data } = useRequest();
  if (data?.programName) return true;
  return false;
};
