import { useQuery } from 'react-query';
import { useItemApi } from '../useItemApi';

export const usePackUnits = () => {
  const api = useItemApi();

  // Always use previously fetched values
  const cacheTime = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years
  // Assume pack units don't change often, i.e. only refetch every once a while
  const staleTime = 60 * 60 * 1000; // 1h
  return useQuery(api.keys.packUnits(), api.get.packUnits, {
    cacheTime,
    staleTime,
  });
};
