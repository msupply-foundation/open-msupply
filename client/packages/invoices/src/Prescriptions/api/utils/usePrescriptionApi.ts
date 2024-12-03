import { useGql, useAuthContext } from '@openmsupply-client/common';
import { ListParams } from '../hooks';
import { getPrescriptionQueries } from '../api';
import { getSdk } from '../operations.generated';

export const usePrescriptionApi = () => {
  const keys = {
    base: () => ['prescription'] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };

  const { client } = useGql();
  const sdk = getSdk(client);
  const { storeId } = useAuthContext();
  const queries = getPrescriptionQueries(sdk, storeId);
  return { ...queries, storeId, keys };
};
