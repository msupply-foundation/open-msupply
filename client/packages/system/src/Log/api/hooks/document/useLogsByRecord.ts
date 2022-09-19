import { SortBy, useQuery } from '@openmsupply-client/common';
import { LogRowFragment } from '../../operations.generated';
import { useLogApi } from '../utils/useLogApi';

export const useLogsByRecord = (
  recordId: string,
  sortBy?: SortBy<LogRowFragment>
) => {
  const api = useLogApi();
  const result = useQuery(api.keys.sortedListByRecord(recordId, sortBy), () =>
    api.get.listByRecord({ recordId, sortBy })
  );

  return { ...result };
};
