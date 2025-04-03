import {
  useQuery,
  SortBy,
  ActivityLogSortInput,
  ActivityLogSortFieldInput,
} from '@openmsupply-client/common';
import { ActivityLogRowFragment } from '../operations.generated';
import { useActivityLogGraphQL } from '../useActivityLogGraphQL';
import { ACTIVITY_LOG } from './keys';

export function useActivityLog(
  recordId: string,
  sortBy?: SortBy<ActivityLogRowFragment>
) {
  const { activityLogApi } = useActivityLogGraphQL();

  const queryKey = [ACTIVITY_LOG, recordId, sortBy];
  const queryFn = async (): Promise<{
    nodes: ActivityLogRowFragment[];
    totalCount: number;
  }> => {
    const filter = { recordId: { equalTo: recordId } };

    const query = await activityLogApi.activityLogs({
      offset: 0,
      first: 1000,
      sort: sortBy ? getSortInput(sortBy) : undefined,
      filter,
    });
    const { nodes, totalCount } = query?.activityLogs;
    return { nodes, totalCount };
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
}

const getSortInput = (
  sortBy: SortBy<ActivityLogRowFragment>
): ActivityLogSortInput => ({
  desc: sortBy.isDesc,
  key: sortBy.key as ActivityLogSortFieldInput,
});
