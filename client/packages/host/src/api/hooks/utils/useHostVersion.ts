import { useQuery, UseQueryResult } from '@openmsupply-client/common';
import { useHostApi } from './useHostApi';

export const useHostVersion = (): UseQueryResult<string> => {
  const api = useHostApi();
  return useQuery(
    api.keys.version(),
    api.get.version,
    // Don't refetch on open. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
