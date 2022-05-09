import {
  useGql,
  useAuthContext,
  SortBy,
} from '@openmsupply-client/common';
import { getLocationQueries, ListParams } from '../../api';
import { getSdk, LocationRowFragment } from '../../operations.generated';

export const useLocationApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['location'] as const,
    detail: (id: string) => [...keys.base(), id] as const,
    list: () => [...keys.base(), 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<LocationRowFragment>) =>
      [...keys.list(), sortBy] as const,
  };
  const { client } = useGql();
  const sdk = getSdk(client);
  const queries = getLocationQueries(sdk, storeId);
  return { ...queries, storeId, keys };
};
