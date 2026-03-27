import {
  getAuthCookie,
  useQuery,
  useSubscription,
} from '@openmsupply-client/common';
import { useSyncApi } from './useSyncApi';
import { SyncStatusUpdatedDocument } from '../../subscriptions';

export const useSyncInfo = (
  refetchInterval: number | false = false,
  enabled: boolean = true
) => {
  const api = useSyncApi();
  const { token } = getAuthCookie();

  // Subscribe to real-time sync status updates via WebSocket.
  // The subscription only provides syncStatus, not numberOfRecordsInPushQueue,
  // so we merge the subscription data with existing cache data.
  const { isSubscribed } = useSubscription({
    queryKey: api.keys.syncInfo(),
    document: SyncStatusUpdatedDocument,
    enabled: !!token && enabled,
    select: data => ({
      syncStatus: data['syncStatusUpdated'],
    }),
  });

  // manually adding the token and setting the authorization header
  // there were instances where the token was not included in the request
  // even though the auth cookie existed with a valid token
  // the query is only enabled if there's a token -
  // no need to check the sync status if there's no token
  const { data, ...rest } = useQuery(
    api.keys.syncInfo(),
    () => api.get.syncInfo(token),
    {
      // Disable polling when subscription is active
      refetchInterval: isSubscribed ? false : refetchInterval,
      enabled: !!token && enabled,
    }
  );

  return {
    ...rest,
    syncStatus: data?.syncStatus,
    numberOfRecordsInPushQueue: data?.numberOfRecordsInPushQueue,
  };
};
