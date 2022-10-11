import { useGql, SortBy } from '@openmsupply-client/common';
import { getLogQueries } from '../../api';
import { getSdk, ActivityLogRowFragment } from '../../operations.generated';

export const useLogApi = () => {
  const keys = {
    base: () => ['log'] as const,
    list: () => [...keys.base(), 'list'] as const,
    sortedList: (sortBy?: SortBy<ActivityLogRowFragment>) =>
      [...keys.list(), sortBy] as const,
    sortedListByRecord: (recordId: string, sortBy?: SortBy<ActivityLogRowFragment>) =>
      [...keys.sortedList(sortBy), recordId] as const,
  };
  const { client } = useGql();
  const sdk = getSdk(client);
  const queries = getLogQueries(sdk);
  return { ...queries, keys };
};
