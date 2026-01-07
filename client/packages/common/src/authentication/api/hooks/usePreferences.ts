import {
  PREFERENCES_QUERY_KEY,
  PreferencesNode,
  useAuthContext,
  useGql,
  useQuery,
} from '@openmsupply-client/common';
import { getSdk } from '../operations.generated';

/** Fields undefined until query has loaded */
export const usePreferences = (): Partial<PreferencesNode> => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const sdk = getSdk(client);

  const { data } = useQuery({
    queryKey: [PREFERENCES_QUERY_KEY, storeId],
    queryFn: async () => {
      const result = await sdk.preferences({ storeId });
      return result.preferences;
    },
    // Only refetch when explicitly invalidated (on sync/updating preferences)
    // Or when switching stores
    cacheTime: Infinity,
    staleTime: Infinity,
    suspense: false,
    enabled: !!storeId,
  });

  return data ?? {};
};
