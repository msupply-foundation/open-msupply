import {
  useGql,
  useAuthContext,
  SortBy,
  FilterByWithBoolean,
} from '@openmsupply-client/common';
import { getSdk, MasterListRowFragment } from '../../operations.generated';
import { getMasterListQueries, ListParams } from '../../api';

export const useMasterListApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['master-list'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (
      sortBy: SortBy<MasterListRowFragment>,
      filterBy?: FilterByWithBoolean
    ) => [...keys.list(), sortBy, filterBy] as const,
  };
  const { client } = useGql();
  const sdk = getSdk(client);
  const queries = getMasterListQueries(sdk, storeId);

  return { ...queries, storeId, keys };
};
