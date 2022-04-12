import {
  useAuthContext,
  useGql,
  useQuery,
  UseQueryResult,
} from '@openmsupply-client/common';
import { getHostQueries } from './api';
import { getSdk } from './operations.generated';

export const useHostApi = () => {
  const keys = {
    base: () => ['host'] as const,
    version: () => [...keys.base(), 'version'] as const,
  };

  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getHostQueries(getSdk(client));
  return { ...queries, storeId, keys };
};

export const useApiVersion = (): UseQueryResult<string> => {
  const api = useHostApi();
  return useQuery(
    api.keys.version(),
    api.get.version(),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
