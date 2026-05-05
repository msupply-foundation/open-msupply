import { useQuery, useSubscription } from '@openmsupply-client/common';
import { useSyncApi } from './useSyncApi';
import {
  SyncInfoV7UpdatedDocument,
  SyncInfoV7UpdatedSubscription,
} from '../../operations.generated';

export const useSyncStatusV7 = (
  refetchInterval: number | false = false,
  enabled?: boolean,
  requireAuth?: boolean
) => {
  const api = useSyncApi();

  const { isSubscribed, data: subData } = useSubscription({
    document: SyncInfoV7UpdatedDocument,
    enabled: enabled !== false,
    requireAuth,
    select: (data: SyncInfoV7UpdatedSubscription) =>
      data.syncInfoV7Updated.syncStatus,
  });

  const { data: queryData, ...rest } = useQuery(
    api.keys.syncStatusV7(),
    api.get.syncStatusV7,
    {
      cacheTime: 0,
      refetchInterval: isSubscribed ? false : refetchInterval,
      enabled,
    }
  );

  return {
    ...rest,
    data: subData ?? queryData ?? null,
  };
};
