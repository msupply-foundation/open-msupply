import {
  Item,
  ListApi,
  SortBy,
  ItemSortFieldInput,
  OmSupplyApi,
  ItemsListViewQuery,
} from '@openmsupply-client/common';
import { ItemRow } from '../types';

const itemsGuard = (itemsQuery: ItemsListViewQuery) => {
  if (itemsQuery.items.__typename === 'ItemConnector') {
    return itemsQuery.items;
  }

  throw new Error(itemsQuery.items.error.description);
};

const onRead =
  (api: OmSupplyApi) =>
  async ({
    first,
    offset,
    sortBy,
  }: {
    first: number;
    offset: number;
    sortBy: SortBy<Item>;
  }): Promise<{
    nodes: ItemRow[];
    totalCount: number;
  }> => {
    const key =
      sortBy.key === 'name' ? ItemSortFieldInput.Name : ItemSortFieldInput.Code;

    const result = await api.itemsListView({
      first,
      offset,
      key,
      desc: sortBy.isDesc,
    });

    const items = itemsGuard(result);
    const nodes: ItemRow[] = items.nodes.map(item => ({ ...item }));

    return { totalCount: items.totalCount, nodes };
  };

export const getItemListViewApi = (api: OmSupplyApi): ListApi<ItemRow> => ({
  onRead:
    ({ first, offset, sortBy }) =>
    () =>
      onRead(api)({ first, offset, sortBy }),
  onDelete: async () => [''],
  onUpdate: async () => '',
  onCreate: async () => '',
});
