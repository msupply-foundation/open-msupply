import {
  SortBy,
  FilterByWithBoolean,
  AssetCategorySortFieldInput,
  AssetClassSortFieldInput,
  AssetTypeSortFieldInput,
  AssetCategoryFilterInput,
  AssetTypeFilterInput,
  InsertAssetLogReasonInput,
  AssetLogStatusInput,
  AssetLogReasonFilterInput,
  AssetPropertyFilterInput,
} from '@openmsupply-client/common';
import { Sdk } from './operations.generated';

export type ListParams<T> = {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
  filterBy?: FilterByWithBoolean | null;
};

const logReasonParsers = {
  toLogReasonInsert: (
    input: Partial<InsertAssetLogReasonInput>
  ): InsertAssetLogReasonInput => ({
    id: input.id ?? '',
    // default enum of NotInUse will never be used as it will fail the checkStatus check first
    // and throw an error.
    assetLogStatus: input.assetLogStatus ?? AssetLogStatusInput.NotInUse,
    reason: input.reason ?? '',
  }),
  checkStatus: (status: string): boolean => {
    switch (status) {
      case AssetLogStatusInput.Decommissioned:
        return true;
      case AssetLogStatusInput.Functioning:
        return true;
      case AssetLogStatusInput.FunctioningButNeedsAttention:
        return true;
      case AssetLogStatusInput.NotFunctioning:
        return true;
      case AssetLogStatusInput.NotInUse:
        return true;
      default:
        return false;
    }
  },
};

export const getAssetQueries = (sdk: Sdk, currentStoreId: string) => ({
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
    logReasons: async (filter: AssetLogReasonFilterInput | undefined) => {
      const result = await sdk.assetLogReasons({
        filter,
        storeId: currentStoreId,
      });
      return result?.assetLogReasons;
    },
  },
  insertLogReason: async (input: InsertAssetLogReasonInput) => {
    if (!logReasonParsers.checkStatus(input.assetLogStatus ?? '')) {
      throw new Error('Cannot parse status');
    }
    const result = await sdk.insertAssetLogReason({
      input: logReasonParsers.toLogReasonInsert(input),
    });
    if (
      result.centralServer.logReason.insertAssetLogReason.__typename ===
      'AssetLogReasonNode'
    ) {
      return result.centralServer.logReason.insertAssetLogReason;
    }

    throw new Error('Could not insert reason');
  },
  deleteLogReason: async (reasonId: string) => {
    const result = await sdk.deleteLogReason({ reasonId });
    if (
      result.centralServer.logReason.deleteLogReason.__typename ===
      'DeleteResponse'
    ) {
      return result.centralServer.logReason;
    }
    throw new Error('Could not delete reason');
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
