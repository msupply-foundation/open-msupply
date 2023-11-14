import { getItemQueries, ListParams } from './../../api';
import { useAuthContext, useGql } from '@openmsupply-client/common';
import { getSdk, ItemRowFragment } from '../../operations.generated';

export const useItemApi = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();

  const keys = {
    base: () => ['item'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams<ItemRowFragment>) =>
      [...keys.list(), params] as const,
    packVariants: () => [...keys.base(), storeId, 'packVariants'] as const,
  };

  const queries = getItemQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};
