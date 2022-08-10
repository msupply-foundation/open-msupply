import { useGql, useAuthContext } from '@openmsupply-client/common';
import { getEncounterQueries, ListParams } from '../../api';
import { getSdk } from '../../operations.generated';

export const useEncounterApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['encounter'] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };
  const { client } = useGql();
  const queries = getEncounterQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
