import {
  InitialisationStatusType,
  PREFERENCES_QUERY_KEY,
  PreferencesNode,
  useAuthContext,
  useGql,
  useInitialisationStatus,
  useQuery,
} from '@openmsupply-client/common';
import { getSdk } from '../operations.generated';

/** Fields undefined until query has loaded */
export const usePreferences = (): Partial<PreferencesNode> => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const { data: initStatus } = useInitialisationStatus();
  const sdk = getSdk(client);

  // The `preferences` field only exists on the operational schema; firing
  // this query while the server is migrating or initialising throws an
  // unhandled "Unknown field" error to the suspense boundary.
  const isOperational =
    initStatus?.status === InitialisationStatusType.Initialised;

  const { data } = useQuery({
    queryKey: [PREFERENCES_QUERY_KEY, storeId],
    queryFn: async () => {
      const result = await sdk.preferences({ storeId });
      return result.preferences;
    },
    // Only refetch when explicitly invalidated (on sync/updating preferences)
    // Or when switching stores
    gcTime: Infinity,
    staleTime: Infinity,
    enabled: !!storeId && isOperational,
  });

  return data ?? {};
};
