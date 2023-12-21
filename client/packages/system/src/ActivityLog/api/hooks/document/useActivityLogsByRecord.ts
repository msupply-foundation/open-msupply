import { SortBy, useQuery } from '@openmsupply-client/common';
import { ActivityLogRowFragment } from '../../operations.generated';
import { useActivityLogApi } from '../utils/useActivityLogApi';

export const useActivityLogsByRecord = (
  recordId: string,
  sortBy?: SortBy<ActivityLogRowFragment>
) => {
  const api = useActivityLogApi();
  const result = useQuery(api.keys.sortedListByRecord(recordId, sortBy), () =>
    api.get.listByRecord({ recordId, sortBy })
  );

  return { ...result };
};
