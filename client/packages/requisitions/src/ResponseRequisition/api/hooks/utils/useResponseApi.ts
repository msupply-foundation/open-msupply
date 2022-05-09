import { useAuthContext, useGql, SortBy } from '@openmsupply-client/common';
import { getResponseQueries, ListParams } from '../../api';
import { getSdk, ResponseRowFragment } from '../../operations.generated';

export const useResponseApi = () => {
  const keys = {
    base: () => ['response'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<ResponseRowFragment>) =>
      [...keys.list(), sortBy] as const,
  };

  const { client } = useGql();
  const sdk = getSdk(client);
  const { storeId } = useAuthContext();
  const queries = getResponseQueries(sdk, storeId);

  return { ...queries, storeId, keys };
};
