import {
  Item,
  SortBy,
  ItemSortFieldInput,
  FilterBy,
} from '@openmsupply-client/common';
import {
  ItemRowFragment,
  ItemsListViewQuery,
  ItemFragment,
} from './operations.generated';
import { ItemApi } from './hooks';
import { getItemSortField } from '../utils';

const itemsGuard = (itemsQuery: ItemsListViewQuery) => {
  if (itemsQuery.items.__typename === 'ItemConnector') {
    return itemsQuery.items;
  }

  throw new Error(itemsQuery.items.error.description);
};

export const ItemQueries = {
  get: {
    list:
      (
        api: ItemApi,
        {
          first,
          offset,
          sortBy,
        }: {
          first: number;
          offset: number;
          sortBy: SortBy<Item>;
        }
      ) =>
      async (): Promise<{
        nodes: ItemRowFragment[];
        totalCount: number;
      }> => {
        const key =
          sortBy.key === 'name'
            ? ItemSortFieldInput.Name
            : ItemSortFieldInput.Code;

        const result = await api.itemsListView({
          first,
          offset,
          key,
          desc: sortBy.isDesc,
        });

        const items = itemsGuard(result);

        return items;
      },
    listWithStockLines: async (
      api: ItemApi,
      {
        first,
        offset,
        sortBy,
        filterBy,
        storeId,
      }: {
        first: number;
        offset: number;
        sortBy: SortBy<ItemFragment>;
        filterBy: FilterBy | null;
        storeId: string;
      }
    ) => {
      const result = await api.itemsWithStockLines({
        key: getItemSortField(sortBy.key),
        filter: filterBy,
        first,
        offset,
        storeId,
      });

      if (result.items.__typename === 'ItemConnector') {
        return result;
      }

      throw new Error('Could not fetch item');
    },
  },
};
