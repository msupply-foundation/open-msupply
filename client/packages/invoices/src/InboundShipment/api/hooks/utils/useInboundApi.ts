import { useAuthContext, useGql, SortBy } from '@openmsupply-client/common';
import { getInboundQueries, ListParams } from '../../api';
import { getSdk, InboundRowFragment } from '../../operations.generated';

export const useInboundApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['inbound'] as const,
    count: () => [...keys.base(), 'count'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<InboundRowFragment>) =>
      [...keys.list(), sortBy] as const,
  };

  const { client } = useGql();
  const queries = getInboundQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};
