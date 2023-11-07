import { useGql, useAuthContext, SortBy } from '@openmsupply-client/common';
import { ListParams, getTemperatureNotificationQueries } from '../../api';
import {
  TemperatureNotificationFragment,
  getSdk,
} from '../../operations.generated';

export const useTemperatureNotificationApi = () => {
  const keys = {
    base: () => ['temperatureNotification'] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    sortedList: (sortBy: SortBy<TemperatureNotificationFragment>) =>
      [...keys.list(), sortBy] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };

  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getTemperatureNotificationQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
