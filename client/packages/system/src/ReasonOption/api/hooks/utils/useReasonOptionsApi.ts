import { useGql, SortBy } from '@openmsupply-client/common';
import { getSdk, ReasonOptionRowFragment } from '../../operations.generated';
import { getReasonOptionsQuery } from '../../api';

export const useReasonOptionsApi = () => {
  const keys = {
    base: () => ['reasonOptions'] as const,
    list: () => [...keys.base(), 'list'] as const,
    sortedList: (sortBy?: SortBy<ReasonOptionRowFragment>) =>
      [...keys.list(), sortBy] as const,
    sortedListActive: (
      isActive: boolean,
      sortBy?: SortBy<ReasonOptionRowFragment>
    ) => [...keys.sortedList(sortBy), isActive] as const,
  };
  const { client } = useGql();
  const sdk = getSdk(client);
  const queries = getReasonOptionsQuery(sdk);
  return { ...queries, keys };
};
