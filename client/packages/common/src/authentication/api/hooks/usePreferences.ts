import {
  PREFERENCES_QUERY_KEY,
  PreferencesNode,
  useAuthContext,
  useGql,
  useQuery,
} from '@openmsupply-client/common';
import { useQueryClient } from 'react-query';
import { getSdk } from '../operations.generated';

/** Fields undefined until query has loaded */
export const usePreferences = (): Partial<PreferencesNode> => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const sdk = getSdk(client);
  const queryClient = useQueryClient();

  const queryKey = [PREFERENCES_QUERY_KEY, storeId];

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await sdk.preferences({ storeId });
      return result.preferences;
    },
    // Only refetch when explicitly invalidated (on sync/updating preferences)
    // Or when switching stores
    cacheTime: Infinity,
    staleTime: Infinity,
    suspense: true,
    enabled: !!storeId,
    retry: 3,
    retryDelay: 1000,
    // Don't cache errors with infinite staleTime — remove from cache so
    // next render retries (e.g. after server switches from init to operational)
    onError: () => {
      queryClient.removeQueries(queryKey);
    },
  });

  return data ?? {};
};
