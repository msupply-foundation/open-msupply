import {
  SortBy,
  ReasonOptionSortInput,
  ReasonOptionSortFieldInput,
} from '@openmsupply-client/common';
import { Sdk, ReasonOptionRowFragment } from './operations.generated';

export type ListParams = { sortBy?: SortBy<ReasonOptionRowFragment> };

const reasonOptionParsers = {
  toSortInput: (
    sortBy: SortBy<ReasonOptionRowFragment>
  ): ReasonOptionSortInput => {
    return {
      desc: sortBy.isDesc,
      key: sortBy.key as ReasonOptionSortFieldInput,
    };
  },
};

export const getReasonOptionsQuery = (sdk: Sdk) => ({
  get: {
    listAllActive: async ({ sortBy }: ListParams) => {
      const response = await sdk.reasonOptions({
        sort: sortBy ? reasonOptionParsers.toSortInput(sortBy) : undefined,
        filter: { isActive: true },
      });
      return response?.reasonOptions;
    },
  },
});
