import { useGql } from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';
import { getStoreQueries, StoreListParams } from '../../api';

export const useStoreApi = () => {
  const keys = {
    base: () => ['store'] as const,
    detail: (id: string) => [...keys.base(), id] as const,
    list: () => [...keys.base(), 'list'] as const,
    paramList: (params?: StoreListParams) => [...keys.list(), params] as const,
  };

  const { client } = useGql();
  const sdk = getSdk(client);
  const queries = getStoreQueries(sdk);
  return { ...queries, keys };
};
