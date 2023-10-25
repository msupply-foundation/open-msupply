import { useQuery } from 'react-query';
import { useItemApi } from '../useItemApi';

export const usePackUnits = () => {
  const api = useItemApi();

  // Assume pack units don't change often, i.e. don't do an API calls every time you need them
  const cacheTime = 60 * 60 * 1000; // 1h
  return useQuery(api.keys.packUnits(), api.get.packUnits, {
    cacheTime,
    // don't refetch
    staleTime: cacheTime,
  });
};
