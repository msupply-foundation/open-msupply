import {
  SortBy,
  ItemSortFieldInput,
  FilterByWithBoolean,
} from '@openmsupply-client/common';
import { Sdk, ItemRowFragment } from './operations.generated';

export type ListParams<T> = {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
  filterBy?: FilterByWithBoolean | null;
  isVisible?: boolean;
};

const itemParsers = {
  toSortField: (sortBy: SortBy<ItemRowFragment>) => {
    const fields: Record<string, ItemSortFieldInput> = {
      name: ItemSortFieldInput.Name,
      code: ItemSortFieldInput.Code,
    };

    return fields[sortBy.key] ?? ItemSortFieldInput.Name;
  },
};

export const getAssetQueries = (sdk: Sdk, storeId: string) => ({
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
    list: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: ListParams<ItemRowFragment>) => {
      const result = await sdk.items({
        first,
        offset,
        key: itemParsers.toSortField(sortBy),
        desc: sortBy.isDesc,
        storeId,
        filter: { ...filterBy, isVisible: true, isActive: true },
      });

      const items = result?.items;

      return items;
    },
  },
});
