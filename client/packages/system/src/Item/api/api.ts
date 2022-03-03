import {
  SortBy,
  ItemSortFieldInput,
  FilterBy,
} from '@openmsupply-client/common';
import { Sdk, ItemRowFragment, ItemFragment } from './operations.generated';
import { getItemSortField } from '../utils';

export const getItemQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    byId: async (itemId: string) => {
      const result = await sdk.itemById({ storeId, itemId });

      const { items } = result;

      if (items.__typename === 'ItemConnector') {
        if (items.nodes.length) {
          return items.nodes[0];
        }
      }

      throw new Error('Item not found');
    },
    listWithStats: async () => {
      const result = await sdk.itemsWithStats({ storeId });

      console.log(result);

      const { items } = result;

      if (result.items.__typename === 'ItemConnector') {
        return items;
      }

      throw new Error('Could not fetch items');
    },

    list:
      ({
        first,
        offset,
        sortBy,
      }: {
        first: number;
        offset: number;
        sortBy: SortBy<ItemRowFragment>;
      }) =>
      async (): Promise<{
        nodes: ItemRowFragment[];
        totalCount: number;
      }> => {
        const key =
          sortBy.key === 'name'
            ? ItemSortFieldInput.Name
            : ItemSortFieldInput.Code;

        const result = await sdk.itemsListView({
          first,
          offset,
          key,
          desc: sortBy.isDesc,
          storeId,
        });

        const items = result.items;

        return items;
      },
    listWithStockLines: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: {
      first: number;
      offset: number;
      sortBy: SortBy<ItemFragment>;
      filterBy: FilterBy | null;
    }) => {
      const result = await sdk.itemsWithStockLines({
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
});
