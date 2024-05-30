import { useGql, useAuthContext } from '@openmsupply-client/common';
import { getNameQueries, ListParams } from '../../api';
import { getSdk } from '../../operations.generated';

export const useNameApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['name'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    donors: () => [...keys.base(), storeId, 'donors'] as const,
    properties: () => ['name-properties'] as const,
  };
  const { client } = useGql();
  const queries = getNameQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
