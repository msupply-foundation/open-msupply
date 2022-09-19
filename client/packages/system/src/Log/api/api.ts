import {
  SortBy,
  LogSortInput,
  LogSortFieldInput,
} from '@openmsupply-client/common';
import { Sdk, LogRowFragment } from './operations.generated';

export type ListParams = { recordId: string; sortBy?: SortBy<LogRowFragment> };

const logParsers = {
  toSortInput: (sortBy: SortBy<LogRowFragment>): LogSortInput => {
    return { desc: sortBy.isDesc, key: sortBy.key as LogSortFieldInput };
  },
};

export const getLogQueries = (sdk: Sdk) => ({
  get: {
    listByRecord: async ({ sortBy, recordId }: ListParams) => {
      const response = await sdk.logs({
        offset: 0,
        first: 1000,
        sort: sortBy ? logParsers.toSortInput(sortBy) : undefined,
        filter: { recordId: { equalTo: recordId } },
      });
      return response?.logs;
    },
  },
});
