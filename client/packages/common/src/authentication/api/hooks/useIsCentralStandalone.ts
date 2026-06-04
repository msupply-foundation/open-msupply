import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';

export const useIsCentralStandalone = (): boolean => {
  const api = useAuthApi();
  const { data } = useQuery({
    queryKey: api.keys.isCentralStandalone,
    queryFn: () => api.get.isCentralStandalone(),
    refetchOnMount: false,
    gcTime: Infinity,
    staleTime: Infinity,
  });
  return !!data;
};
