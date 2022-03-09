import {
  ItemNodeType,
  SortBy,
  ItemSortFieldInput,
  FilterBy,
} from '@openmsupply-client/common';
import { Sdk, ItemRowFragment } from './operations.generated';

export type ListParams<T> = {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
  filterBy?: FilterBy | null;
};

const itemParsers = {
  toSort: (sortBy: SortBy<ItemRowFragment>) => {
    const fields: Record<string, ItemSortFieldInput> = {
      name: ItemSortFieldInput.Name,
      code: ItemSortFieldInput.Code,
    };

    return fields[sortBy.key] ?? ItemSortFieldInput.Name;
  },
};

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
    serviceItems:
      ({ first, offset, sortBy }: ListParams<ItemRowFragment>) =>
      async () => {
        const key = itemParsers.toSort(sortBy);
        const result = await sdk.items({
          storeId,
          first,
          offset,
          key,
          desc: sortBy.isDesc,
          filter: { type: { equalTo: ItemNodeType.Service } },
        });

        const { items } = result;
        return items;
      },

    listWithStats: async () => {
      const result = await sdk.itemsWithStats({ storeId });

      const { items } = result;

      if (result.items.__typename === 'ItemConnector') {
        return items;
      }

      throw new Error('Could not fetch items');
    },

    list:
      ({ first, offset, sortBy }: ListParams<ItemRowFragment>) =>
      async (): Promise<{
        nodes: ItemRowFragment[];
        totalCount: number;
      }> => {
        const key =
          sortBy.key === 'name'
            ? ItemSortFieldInput.Name
            : ItemSortFieldInput.Code;

        const result = await sdk.items({
          first,
          offset,
          key,
          desc: sortBy.isDesc,
          storeId,
        });

        const items = result.items;

        return items;
      },
  },
});
