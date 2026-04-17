import {
  useMutation,
  useQuery,
  useSubscription,
} from '@openmsupply-client/common';
import { useSyncApi } from './useSyncApi';
import {
  SyncInfoUpdatedDocument,
  SyncInfoUpdatedSubscription,
} from '../../operations.generated';

export const useSyncStatus = (
  refetchInterval: number | false = false,
  enabled?: boolean,
  requireAuth?: boolean
) => {
  const api = useSyncApi();

  const { isSubscribed, data: subData } = useSubscription({
    document: SyncInfoUpdatedDocument,
    enabled: enabled !== false,
    requireAuth,
    select: (data: SyncInfoUpdatedSubscription) =>
      data.syncInfoUpdated.syncStatus,
  });

  // Fallback to polling if subscription fails or is unavailable
  const { data: queryData, ...rest } = useQuery(
    api.keys.syncStatus(),
    api.get.syncStatus,
    {
      cacheTime: 0,
      refetchInterval: isSubscribed ? false : refetchInterval,
      // Everytime a new consumer mounts, they need to get the latest sync info, so we always want to refetch on mount
      // Any updates, will be handled by the subscription if it's working, otherwise we'll just get the latest info on the next poll
      refetchOnMount: 'always',
      enabled,
    }
  );

  return {
    ...rest,
    data: subData ?? queryData ?? null,
  };
};

export const useMutateSyncStatus = () => {
  const api = useSyncApi();
  return useMutation(api.get.syncStatus);
};
