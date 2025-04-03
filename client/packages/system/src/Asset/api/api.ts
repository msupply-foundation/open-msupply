import {
  SortBy,
  FilterByWithBoolean,
  AssetClassSortFieldInput,
  AssetTypeSortFieldInput,
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
