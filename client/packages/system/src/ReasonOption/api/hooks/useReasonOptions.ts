import { SortBy, useQuery } from '@openmsupply-client/common';
import { ReasonOptionRowFragment } from '../operations.generated';
import { useReasonOptionsApi } from './useReasonOptionsApi';

export const useReasonOptions = (sortBy?: SortBy<ReasonOptionRowFragment>) => {
  const api = useReasonOptionsApi();
  const result = useQuery({
    queryKey: api.keys.sortedList(sortBy),

    queryFn: () =>
      api.get.listAllActive({ sortBy })
  });

  return { ...result };
};
