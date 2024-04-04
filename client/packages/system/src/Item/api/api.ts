import {
  ItemNodeType,
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
    serviceItems: async (params: ListParams<ItemRowFragment>) => {
      const result = await getItemQueries(sdk, storeId).get.list({
        ...params,
        filterBy: {
          ...params.filterBy,
          type: { equalTo: ItemNodeType.Service },
          isActive: true,
        },
      });
      return result;
    },
    stockItems: async (params: ListParams<ItemRowFragment>) => {
      const result = await getItemQueries(sdk, storeId).get.list({
        ...params,
        filterBy: {
          ...params.filterBy,
          type: { equalTo: ItemNodeType.Stock },
          isVisible: { equalTo: true },
          isActive: true,
        },
      });
      return result;
    },
    itemStockOnHand: async ({
      filterBy,
      first,
      offset,
      sortBy,
    }: ListParams<ItemRowFragment>) => {
      const result = await sdk.itemStockOnHand({
        key: itemParsers.toSortField(sortBy),
        first,
        isDesc: sortBy.isDesc,
        offset,
        storeId,
        filter: {
          ...filterBy,
          type: { equalTo: ItemNodeType.Stock },
          isVisible: true,
          isActive: true,
        },
      });

      const { items } = result;

      if (result?.items?.__typename === 'ItemConnector') {
        return items;
      }

      throw new Error('Could not fetch items');
    },
    stockItemsWithStats: async ({
      filterBy,
      first,
      offset,
      sortBy,
    }: ListParams<ItemRowFragment>) => {
      const result = await sdk.itemsWithStats({
        key: itemParsers.toSortField(sortBy),
        first,
        isDesc: sortBy.isDesc,
        offset,
        storeId,
        // the filter previously only showed type: { equalTo: ItemNodeType.Stock },
        // because service items don't have SOH & AMC so it's odd to show them alongside stock items
        filter: {
          ...filterBy,
          isVisible: true,
          isActive: true,
        },
      });

      const { items } = result;

      if (result?.items?.__typename === 'ItemConnector') {
        return items;
      }

      throw new Error('Could not fetch items');
    },
    stockItemsWithStockLines: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: ListParams<ItemRowFragment>) => {
      const result = await sdk.itemsWithStockLines({
        first,
        offset,
        key: itemParsers.toSortField(sortBy),
        desc: sortBy.isDesc,
        storeId,
        filter: {
          ...filterBy,
          type: { equalTo: ItemNodeType.Stock },
          isVisible: true,
          isActive: true,
        },
      });

      const { items } = result;

      if (result?.items?.__typename === 'ItemConnector') {
        return items;
      }

      throw new Error('Could not fetch items');
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
