import {
  SortBy,
  FilterBy,
  MasterListSortFieldInput,
} from '@openmsupply-client/common';
import { Sdk, MasterListRowFragment } from './operations.generated';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<MasterListRowFragment>;
  filterBy: FilterBy | null;
};

const masterListParser = {
  toSort: (sortBy: SortBy<MasterListRowFragment>): MasterListSortFieldInput => {
    if (sortBy.key === 'name') return MasterListSortFieldInput.Name;
    if (sortBy.key === 'code') return MasterListSortFieldInput.Code;
    return MasterListSortFieldInput.Description;
  },
};

export const getMasterListQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({ first, offset, sortBy, filterBy }: ListParams) => {
      const key = masterListParser.toSort(sortBy);
      const desc = !!sortBy.isDesc;
      const result = await sdk.masterLists({
        first,
        offset,
        key,
        desc,
        filter: filterBy,
        storeId,
      });
      return result.masterLists;
    },
  },
});
