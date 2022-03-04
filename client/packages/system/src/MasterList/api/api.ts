import {
  SortBy,
  FilterBy,
  MasterListSortFieldInput,
} from '@openmsupply-client/common';
import { Sdk } from './operations.generated';
import { MasterList, MasterListRow } from './../types';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<MasterList>;
  filterBy: FilterBy | null;
};

const getMasterListSortField = (
  sortField: string
): MasterListSortFieldInput => {
  if (sortField === 'name') return MasterListSortFieldInput.Name;
  if (sortField === 'code') return MasterListSortFieldInput.Code;
  return MasterListSortFieldInput.Description;
};

export const getMasterListQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: ListParams): Promise<{
      nodes: MasterListRow[];
      totalCount: number;
    }> => {
      const key = getMasterListSortField(sortBy.key);
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
