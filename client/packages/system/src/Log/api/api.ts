import {
  SortBy,
  ActivityLogSortInput,
  ActivityLogSortFieldInput,
} from '@openmsupply-client/common';
import { Sdk, ActivityLogRowFragment } from './operations.generated';

export type ListParams = { recordId: string; sortBy?: SortBy<ActivityLogRowFragment> };

const logParsers = {
  toSortInput: (sortBy: SortBy<ActivityLogRowFragment>): ActivityLogSortInput => {
    return { desc: sortBy.isDesc, key: sortBy.key as ActivityLogSortFieldInput };
  },
};

export const getLogQueries = (sdk: Sdk) => ({
  get: {
    listByRecord: async ({ sortBy, recordId }: ListParams) => {
      const response = await sdk.activityLogs({
        offset: 0,
        first: 1000,
        sort: sortBy ? logParsers.toSortInput(sortBy) : undefined,
        filter: { recordId: { equalTo: recordId } },
      });
      return response?.activityLogs;
    },
  },
});
