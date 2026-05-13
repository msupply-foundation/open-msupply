import { useQuery } from 'react-query';
import { useAuthApi } from './useAuthApi';

export const useIsCentralStandalone = (): boolean => {
  const api = useAuthApi();
  const { data } = useQuery(
    api.keys.isCentralStandalone,
    () => api.get.isCentralStandalone(),
    {
      refetchOnMount: false,
      cacheTime: Infinity,
      staleTime: Infinity,
    }
  );
  return !!data;
};
