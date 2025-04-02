import {
  SortBy,
  FilterByWithBoolean,
  AssetCategorySortFieldInput,
  AssetClassSortFieldInput,
  AssetTypeSortFieldInput,
  AssetCategoryFilterInput,
  AssetTypeFilterInput,
  AssetPropertyFilterInput,
} from '@openmsupply-client/common';
import { Sdk } from './operations.generated';

export type ListParams<T> = {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
  filterBy?: FilterByWithBoolean | null;
};

export const getAssetQueries = (sdk: Sdk) => ({
  get: {
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
    properties: async (filter: AssetPropertyFilterInput | undefined) => {
      const result = await sdk.assetProperties({
        filter,
      });

      if (result?.assetProperties?.__typename === 'AssetPropertyConnector') {
        return result?.assetProperties?.nodes;
      }

      throw new Error('Unable to fetch properties');
    },
  },
});

export const getAssetPropertyQueries = (sdk: Sdk) => ({
  get: {
    properties: async (filter: AssetPropertyFilterInput | undefined) => {
      const result = await sdk.assetProperties({
        filter,
      });

      if (result?.assetProperties?.__typename === 'AssetPropertyConnector') {
        return result?.assetProperties?.nodes;
      }

      throw new Error('Unable to fetch properties');
    },
  },
});
