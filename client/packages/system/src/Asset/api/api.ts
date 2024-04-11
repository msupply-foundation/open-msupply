import {
  SortBy,
  FilterByWithBoolean,
  AssetCatalogueItemSortFieldInput,
  AssetCategorySortFieldInput,
  AssetClassSortFieldInput,
  AssetTypeSortFieldInput,
  AssetCategoryFilterInput,
  AssetTypeFilterInput,
  InsertAssetCatalogueItemInput,
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
  toInsert: (
    input: AssetCatalogueItemFragment
  ): InsertAssetCatalogueItemInput => ({
    id: input.id ?? '',
    subCatalogue: input.subCatalogue,
    code: input.code ?? '',
    manufacturer: input.manufacturer,
    model: input.model ?? '',
    classId: input.assetClassId,
    categoryId: input.assetCategoryId,
    typeId: input.assetTypeId,
  }),
};

export const getAssetQueries = (sdk: Sdk) => ({
  get: {
    byId: async (assetCatalogueItemId: string) => {
      const result = await sdk.assetCatalogueItemById({
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
        filter: filterBy,
      });

      const items = result?.assetCatalogueItems;

      return items;
    },
    listAll: async ({ sortBy }: ListParams<AssetCatalogueItemFragment>) => {
      const result = await sdk.assetCatalogueItems({
        key: itemParsers.toSortField(sortBy),
        desc: sortBy.isDesc,
      });

      const items = result?.assetCatalogueItems;

      return items;
    },
    categories: async (filter: AssetCategoryFilterInput | undefined) => {
      const result = await sdk.assetCategories({
        filter,
        sort: { key: AssetCategorySortFieldInput.Name, desc: false },
      });
      const categories = result?.assetCategories;

      return categories;
    },
    classes: async () => {
      const result = await sdk.assetClasses({
        sort: { key: AssetClassSortFieldInput.Name, desc: false },
      });
      const classes = result?.assetClasses;

      return classes;
    },
    types: async (filter: AssetTypeFilterInput | undefined) => {
      const result = await sdk.assetTypes({
        filter,
        sort: { key: AssetTypeSortFieldInput.Name, desc: false },
      });
      const types = result?.assetTypes;

      return types;
    },
  },
  insert: async (input: AssetCatalogueItemFragment, storeId: string) => {
    const result = await sdk.insertAssetCatalogueItem({
      input: itemParsers.toInsert(input),
      storeId,
    });
    const insertAssetCatalogueItem =
      result.centralServer.assetCatalogue.insertAssetCatalogueItem;

    return insertAssetCatalogueItem;
  },
  delete: async (id: string) => {
    const result = await sdk.deleteAssetCatalogueItem({
      assetCatalogueItemId: id,
    });
    const deleteAssetCatalogueItem =
      result.centralServer.assetCatalogue.deleteAssetCatalogueItem;

    if (deleteAssetCatalogueItem?.__typename === 'DeleteResponse') {
      return deleteAssetCatalogueItem.id;
    }

    throw new Error('Could not delete asset catalogue item');
  },
});
