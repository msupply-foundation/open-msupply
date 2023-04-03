import { getAuthCookie, useQuery } from '@openmsupply-client/common';
import { useHostApi } from './useHostApi';

export const useSyncInfo = (refetchInterval: number | false = false) => {
  const api = useHostApi();
  const { token } = getAuthCookie();

  // manually adding the token and setting the authorization header
  // there were instances where the token was not included in the request
  // even though the auth cookie existed with a valid token
  // the query is only enabled if there's a token -
  // no need to check the sync status if there's no token
  const { data, ...rest } = useQuery(
    api.keys.syncInfo(),
    () => api.get.syncInfo(token),
    {
      refetchInterval,
      enabled: !!token,
    }
  );

  return {
    ...rest,
    syncStatus: data?.syncStatus,
    numberOfRecordsInPushQueue: data?.numberOfRecordsInPushQueue,
  };
};
