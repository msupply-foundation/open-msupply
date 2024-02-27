import {
  SortBy,
  FilterByWithBoolean,
  AssetCatalogueItemSortFieldInput,
  AssetCategorySortFieldInput,
  AssetClassSortFieldInput,
  AssetTypeSortFieldInput,
} from '@openmsupply-client/common';
import { Sdk, AssetCatalogueItemFragment } from './operations.generated';

export type ListParams<T> = {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
  filterBy?: FilterByWithBoolean | null;
};

const itemParsers = {
  toSortField: (sortBy: SortBy<AssetCatalogueItemFragment>) => {
    const fields: Record<string, AssetCatalogueItemSortFieldInput> = {
      catalogue: AssetCatalogueItemSortFieldInput.Catalogue,
      code: AssetCatalogueItemSortFieldInput.Code,
      make: AssetCatalogueItemSortFieldInput.Manufacturer,
      model: AssetCatalogueItemSortFieldInput.Model,
    };

    return fields[sortBy.key] ?? AssetCatalogueItemSortFieldInput.Manufacturer;
  },
};

export const getAssetQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    byId: async (assetCatalogueItemId: string) => {
      const result = await sdk.assetCatalogueItemById({
        storeId,
        assetCatalogueItemId,
      });
      const { assetCatalogueItems } = result;
      if (assetCatalogueItems.__typename === 'AssetCatalogueItemConnector') {
        if (assetCatalogueItems.nodes.length) {
          return assetCatalogueItems.nodes[0];
        }
      }

      throw new Error('Asset catalogue item not found');
    },
    list: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: ListParams<AssetCatalogueItemFragment>) => {
      const result = await sdk.assetCatalogueItems({
        first,
        offset,
        key: itemParsers.toSortField(sortBy),
        desc: sortBy.isDesc,
        storeId,
        filter: filterBy,
      });

      const items = result?.assetCatalogueItems;

      return items;
    },
    listAll: async ({ sortBy }: ListParams<AssetCatalogueItemFragment>) => {
      const result = await sdk.assetCatalogueItems({
        key: itemParsers.toSortField(sortBy),
        desc: sortBy.isDesc,
        storeId,
      });

      const items = result?.assetCatalogueItems;

      return items;
    },
    categories: async () => {
      const result = await sdk.assetCategories({
        storeId,
        sort: { key: AssetCategorySortFieldInput.Name, desc: false },
      });
      const categories = result?.assetCategories;

      return categories;
    },
    classes: async () => {
      const result = await sdk.assetClasses({
        storeId,
        sort: { key: AssetClassSortFieldInput.Name, desc: false },
      });
      const classes = result?.assetClasses;

      return classes;
    },
    types: async () => {
      const result = await sdk.assetTypes({
        storeId,
        sort: { key: AssetTypeSortFieldInput.Name, desc: false },
      });
      const types = result?.assetTypes;

      return types;
    },
  },
});
