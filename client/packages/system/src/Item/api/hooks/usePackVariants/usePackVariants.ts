import { useQuery } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';

export const usePackVariants = () => {
  const api = useItemApi();

  // Always use previously fetched values
  const cacheTime = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years
  // Assume pack units don't change often, i.e. only refetch every once a while
  const staleTime = 60 * 60 * 1000; // 1h
  return useQuery(api.keys.packVariants(), api.get.packVariants, {
    cacheTime,
    staleTime,
  });
};
