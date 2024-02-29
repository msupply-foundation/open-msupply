import {
  SortBy,
  FilterByWithBoolean,
  AssetSortFieldInput,
  InsertAssetInput,
} from '@openmsupply-client/common';
import { Sdk, AssetFragment } from './operations.generated';

export type ListParams<T> = {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
  filterBy?: FilterByWithBoolean | null;
};

const itemParsers = {
  toSortField: (sortBy: SortBy<AssetFragment>) => {
    const fields: Record<string, AssetSortFieldInput> = {
      name: AssetSortFieldInput.Name,
      installationDate: AssetSortFieldInput.InstallationDate,
      replacementData: AssetSortFieldInput.ReplacementDate,
      serialNumber: AssetSortFieldInput.SerialNumber,
    };

    return fields[sortBy.key] ?? AssetSortFieldInput.Name;
  },
};

export const getAssetQueries = (
  sdk: Sdk,
  storeId: string,
  classId: string
) => ({
  get: {
    byId: async (assetId: string) => {
      const result = await sdk.assetById({
        storeId,
        assetId,
      });
      const { assets } = result;
      if (assets.__typename === 'AssetConnector') {
        if (assets.nodes.length) {
          return assets.nodes[0];
        }
      }

      throw new Error('Asset not found');
    },
    list: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: ListParams<AssetFragment>) => {
      const result = await sdk.assets({
        first,
        offset,
        key: itemParsers.toSortField(sortBy),
        desc: sortBy.isDesc,
        storeId,
        filter: { ...filterBy, classId: { equalTo: classId } },
      });

      const items = result?.assets;

      return items;
    },
    listAll: async ({ sortBy }: ListParams<AssetFragment>) => {
      const result = await sdk.assets({
        key: itemParsers.toSortField(sortBy),
        desc: sortBy.isDesc,
        storeId,
        filter: { classId: { equalTo: classId } },
      });

      const items = result?.assets;

      return items;
    },
  },
  insert: async (input: InsertAssetInput): Promise<string> => {
    const result = await sdk.insertAsset({
      input,
      storeId,
    });
    const { insertAsset } = result;

    if (insertAsset?.__typename === 'AssetNode') {
      return insertAsset.id;
    }

    throw new Error('Could not insert asset');
  },
  delete: async (assetId: string, storeId: string): Promise<string> => {
    const result = await sdk.deleteAsset({ assetId, storeId });
    const { deleteAsset } = result;
    if (deleteAsset?.__typename === 'DeleteResponse') {
      return deleteAsset.id;
    }

    throw new Error('Could not delete asset');
  },
});
