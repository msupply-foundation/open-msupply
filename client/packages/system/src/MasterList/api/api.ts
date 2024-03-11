import {
  SortBy,
  MasterListSortFieldInput,
  FilterByWithBoolean,
  MasterListFilterInput,
  MasterListLineFilterInput,
  MasterListLineSortFieldInput,
} from '@openmsupply-client/common';
import {
  Sdk,
  MasterListRowFragment,
  MasterListLineFragment,
} from './operations.generated';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<MasterListRowFragment>;
  filterBy: MasterListFilterInput | null;
};

export type LinesParams = {
  first: number;
  offset: number;
  sortBy: SortBy<MasterListLineFragment>;
  filterBy: MasterListLineFilterInput | null;
};

const masterListParser = {
  toSort: (sortBy: SortBy<MasterListRowFragment>): MasterListSortFieldInput => {
    if (sortBy.key === 'name') return MasterListSortFieldInput.Name;
    if (sortBy.key === 'code') return MasterListSortFieldInput.Code;
    return MasterListSortFieldInput.Description;
  },
};

const masterListLineParser = {
  toSort: (
    sortBy: SortBy<MasterListLineFragment>
  ): MasterListLineSortFieldInput => {
    if (sortBy.key === 'code') return MasterListLineSortFieldInput.Code;
    return MasterListLineSortFieldInput.Name;
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
    lines: async (
      id: string,
      { first, offset, sortBy, filterBy }: LinesParams
    ) => {
      const key = masterListLineParser.toSort(sortBy);
      const result = await sdk.masterListLines({
        masterListId: id,
        page: { first, offset },
        sort: {
          desc: !!sortBy.isDesc,
          key,
        },
        filter: filterBy,
        storeId,
      });
      return result?.masterListLines;
    },
  },
});
