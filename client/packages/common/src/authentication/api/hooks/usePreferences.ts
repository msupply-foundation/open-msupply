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
  const { storeId, token } = useAuthContext();
  const sdk = getSdk(client);

  const { data } = useQuery({
    // Adding the token in as this query will fail and log the user out if the token is incorrect
    // Am having issues with an old token being used here on android after a logout/login cycle
    queryKey: [PREFERENCES_QUERY_KEY, storeId, token],
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
  });

  return data ?? {};
};
