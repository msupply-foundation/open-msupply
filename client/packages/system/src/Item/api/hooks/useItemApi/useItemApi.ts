import { getItemQueries, ListParams } from './../../api';
import { useAuthContext, useOmSupplyApi } from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';

export const useItemApi = () => {
  const { client } = useOmSupplyApi();
  const { storeId } = useAuthContext();

  const keys = {
    base: () => ['item'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: <T>(params: ListParams<T>) => [...keys.list(), params] as const,
  };

  const queries = getItemQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};
