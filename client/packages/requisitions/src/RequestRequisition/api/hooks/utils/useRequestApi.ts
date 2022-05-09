import { useAuthContext, useGql, SortBy } from '@openmsupply-client/common';
import { getRequestQueries, ListParams } from '../../api';
import { getSdk, RequestRowFragment } from '../../operations.generated';

export const useRequestApi = () => {
  const keys = {
    base: () => ['request'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<RequestRowFragment>) =>
      [...keys.list(), sortBy] as const,
    chartData: (lineId: string) => [...keys.base(), storeId, lineId] as const,
  };

  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getRequestQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};
