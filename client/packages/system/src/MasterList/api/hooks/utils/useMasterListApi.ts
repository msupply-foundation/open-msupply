import {
  useGql,
  useAuthContext,
  SortBy,
  FilterBy,
} from '@openmsupply-client/common';
import { getSdk, MasterListRowFragment } from '../../operations.generated';
import { getMasterListQueries, ListParams } from '../../api';

export const useMasterListApi = (storeId?: string) => {
  const { storeId: loggedInStore } = useAuthContext();
  const keys = {
    base: () => ['master-list'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<MasterListRowFragment>, filterBy?: FilterBy) =>
      [...keys.list(), sortBy, filterBy] as const,
  };
  const { client } = useGql();
  const sdk = getSdk(client);
  const queries = getMasterListQueries(sdk, storeId || loggedInStore);

  return { ...queries, storeId, keys };
};
