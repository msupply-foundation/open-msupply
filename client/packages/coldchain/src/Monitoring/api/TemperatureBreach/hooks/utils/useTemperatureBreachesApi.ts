import { useGql, useAuthContext, SortBy } from '@openmsupply-client/common';
import { ListParams, getTemperatureBreachQueries } from '../../api';
import { TemperatureBreachFragment, getSdk } from '../../operations.generated';

export const useTemperatureBreachApi = () => {
  const keys = {
    base: () => ['temperatureBreach'] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    sortedList: (sortBy: SortBy<TemperatureBreachFragment>) =>
      [...keys.list(), sortBy] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };

  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getTemperatureBreachQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
