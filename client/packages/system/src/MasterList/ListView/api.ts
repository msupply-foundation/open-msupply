import {
  MasterListSortFieldInput,
  OmSupplyApi,
  SortBy,
  ListApi,
  FilterBy,
} from '@openmsupply-client/common';
import { MasterList, MasterListRow } from '../types';

const getMasterListSortField = (
  sortField: string
): MasterListSortFieldInput => {
  if (sortField === 'name') return MasterListSortFieldInput.Name;
  if (sortField === 'code') return MasterListSortFieldInput.Code;
  return MasterListSortFieldInput.Description;
};

const onRead =
  (api: OmSupplyApi, storeId: string) =>
  async ({
    first,
    offset,
    sortBy,
    filterBy,
  }: {
    first: number;
    offset: number;
    sortBy: SortBy<MasterList>;
    filterBy: FilterBy | null;
  }): Promise<{
    nodes: MasterListRow[];
    totalCount: number;
  }> => {
    const key = getMasterListSortField(sortBy.key);
    const desc = !!sortBy.isDesc;
    const result = await api.masterLists({
      first,
      offset,
      key,
      desc,
      filter: filterBy,
      storeId,
    });
    const masterLists = result.masterLists;
    const nodes: MasterListRow[] = masterLists.nodes.map(masterList => ({
      ...masterList,
    }));

    return { totalCount: masterLists.totalCount, nodes };
  };

export const getMasterListListViewApi = (
  api: OmSupplyApi,
  storeId: string
): ListApi<MasterListRow> => ({
  onRead:
    ({ first, offset, sortBy, filterBy }) =>
    () =>
      onRead(api, storeId)({ first, offset, sortBy, filterBy }),
  onDelete: async () => [''],
  onUpdate: async () => '',
  onCreate: async () => '',
});
