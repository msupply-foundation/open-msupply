import { useGql, useAuthContext } from '@openmsupply-client/common';
import { ListParams, getTemperatureChartQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const useTemperatureChartApi = () => {
  const keys = {
    base: () => ['temperatureChart'] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };

  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getTemperatureChartQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
