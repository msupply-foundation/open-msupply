import { useGql, useAuthContext, SortBy } from '@openmsupply-client/common';
import { ListParams, getSensorQueries } from '../../api';
import { SensorFragment, getSdk } from '../../operations.generated';

export const useSensorApi = () => {
  const keys = {
    base: () => ['sensor'] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    sortedList: (sortBy: SortBy<SensorFragment>) =>
      [...keys.list(), sortBy] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };

  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getSensorQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
