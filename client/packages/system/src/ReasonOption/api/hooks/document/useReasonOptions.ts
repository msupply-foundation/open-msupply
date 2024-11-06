import { SortBy, useQuery } from '@openmsupply-client/common';
import { ReasonOptionRowFragment } from '../../operations.generated';
import { useReasonOptionsApi } from '../utils/useReasonOptionsApi';

export const useReasonOptions = (sortBy?: SortBy<ReasonOptionRowFragment>) => {
  const api = useReasonOptionsApi();
  const result = useQuery(api.keys.sortedList(sortBy), () =>
    api.get.listAllActive({ sortBy })
  );

  return { ...result };
};
