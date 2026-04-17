import {
  useQuery,
  SortBy,
  ActivityLogSortInput,
  ActivityLogSortFieldInput,
  ActivityLogNodeType,
  isEnumValue,
} from '@openmsupply-client/common';
import { ActivityLogRowFragment } from '../operations.generated';
import { useActivityLogGraphQL } from '../useActivityLogGraphQL';
import { ACTIVITY_LOG } from './keys';

export function useActivityLog(
  recordId: string,
  enabled: boolean = true,
  logType?: ActivityLogNodeType,
  sortBy?: SortBy<ActivityLogRowFragment>
) {
  const { activityLogApi } = useActivityLogGraphQL();

  const queryKey = [ACTIVITY_LOG, recordId, sortBy];
  const queryFn = async (): Promise<{
    nodes: ActivityLogRowFragment[];
    totalCount: number;
  }> => {
    const filter = {
      recordId: { equalTo: recordId },
      ...(logType ? { type: { equalTo: logType } } : {}),
    };

    const query = await activityLogApi.activityLogs({
      offset: 0,
      first: 1000,
      sort: sortBy ? getSortInput(sortBy) : undefined,
      filter,
    });
    const { nodes, totalCount } = query?.activityLogs;
    return { nodes, totalCount };
  };

  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
  });
  return query;
}

const getSortInput = (
  sortBy: SortBy<ActivityLogRowFragment>
): ActivityLogSortInput => ({
  desc: sortBy.isDesc,
  key: isEnumValue(ActivityLogSortFieldInput, sortBy.key)
    ? sortBy.key
    : ActivityLogSortFieldInput.ActivityLogType,
});
