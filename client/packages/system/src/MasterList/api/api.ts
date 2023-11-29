import {
  SortBy,
  MasterListSortFieldInput,
  FilterByWithBoolean,
} from '@openmsupply-client/common';
import { Sdk, MasterListRowFragment } from './operations.generated';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<MasterListRowFragment>;
  filterBy: FilterByWithBoolean | null;
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
        filter: { ...filterBy, existsForStoreId: { equalTo: storeId } },
        storeId,
      });
      return result?.masterLists;
    },
    byItemId: async (itemId: string) => {
      const result = await sdk.masterListsByItemId({ itemId, storeId });
      return result?.masterLists;
    },
    listAll: async ({
      sortBy,
      filter,
    }: {
      sortBy: SortBy<MasterListRowFragment>;
      filter?: FilterByWithBoolean;
    }) => {
      const key = masterListParser.toSort(sortBy);
      const desc = !!sortBy.isDesc;
      const result = await sdk.masterLists({
        key,
        desc,
        filter,
        storeId,
      });
      return result?.masterLists;
    },
    byId: async (id: string) => {
      const filter = { id: { equalTo: id } };
      const result = await sdk.masterList({
        filter,
        storeId,
      });

      if (
        result?.masterLists?.totalCount === 1 &&
        result?.masterLists?.nodes[0]?.__typename === 'MasterListNode'
      ) {
        return result?.masterLists.nodes[0];
      }

      throw new Error('Record not found');
    },
  },
});
