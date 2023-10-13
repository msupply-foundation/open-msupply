import { useGql, useAuthContext, SortBy } from '@openmsupply-client/common';
import { ListParams, getTemperatureLogQueries } from '../../api';
import { TemperatureLogFragment, getSdk } from '../../operations.generated';

export const useTemperatureLogApi = () => {
  const keys = {
    base: () => ['temperatureLog'] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    sortedList: (sortBy: SortBy<TemperatureLogFragment>) =>
      [...keys.list(), sortBy] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };

  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getTemperatureLogQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
