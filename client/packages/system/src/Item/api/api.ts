import {
  ItemNodeType,
  SortBy,
  ItemSortFieldInput,
  InsertPackVariantInput,
  UpdatePackVariantInput,
  DeletePackVariantInput,
  FilterByWithBoolean,
} from '@openmsupply-client/common';
import { Sdk, ItemRowFragment, VariantFragment } from './operations.generated';

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

const packVariantParsers = {
  toInsert: (packVariant: VariantFragment): InsertPackVariantInput => ({
    id: packVariant.id,
    itemId: packVariant.itemId,
    packSize: packVariant.packSize,
    shortName: packVariant.shortName,
    longName: packVariant.longName,
  }),
  toUpdate: (packVariant: VariantFragment): UpdatePackVariantInput => ({
    id: packVariant.id,
    shortName: packVariant.shortName,
    longName: packVariant.longName,
  }),
  toDelete: (packVariant: VariantFragment): DeletePackVariantInput => ({
    id: packVariant.id,
  }),
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
    packVariants: async () => {
      const result = await sdk.packVariants({ storeId });

      return result.packVariants;
    },
  },
  insertPackVariant: async (input: VariantFragment) => {
    const result = await sdk.insertPackVariant({
      storeId,
      input: packVariantParsers.toInsert(input),
    });

    return result.centralServer.packVariant.insertPackVariant;
  },
  updatePackVariant: async (input: VariantFragment) => {
    const result = await sdk.updatePackVariant({
      storeId,
      input: packVariantParsers.toUpdate(input),
    });

    return result.centralServer.packVariant.updatePackVariant;
  },
  deletePackVariant: async (input: VariantFragment) =>
    await sdk.deletePackVariant({
      storeId,
      input: packVariantParsers.toDelete(input),
    }),
});
