import {
  INIT_STATUS_QUERY_KEY,
  InitialisationStatusNode,
  InitialisationStatusType,
  PREFERENCES_QUERY_KEY,
  PreferencesNode,
  skipToken,
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

  // Read the init status from the shared query cache without creating a new
  // WebSocket subscription. useInitialisationStatus (called once from PreInit
  // in Host.tsx) manages the subscription and keeps this cache populated.
  // Using skipToken means this observer never fetches — it only subscribes to
  // cache updates written by useInitialisationStatus.
  const { data: initStatus } = useQuery<InitialisationStatusNode | undefined>({
    queryKey: [INIT_STATUS_QUERY_KEY],
    queryFn: skipToken,
  });

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
