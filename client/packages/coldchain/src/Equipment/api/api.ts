import {
  SortBy,
  FilterByWithBoolean,
  AssetSortFieldInput,
  InsertAssetInput,
  UpdateAssetInput,
  setNullableInput,
} from '@openmsupply-client/common';
import { Sdk, AssetFragment } from './operations.generated';
import { CCE_CLASS_ID } from '../utils';

export type ListParams<T> = {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
  filterBy?: FilterByWithBoolean | null;
};

const assetParsers = {
  toSortField: (sortBy: SortBy<AssetFragment>) => {
    const fields: Record<string, AssetSortFieldInput> = {
      name: AssetSortFieldInput.Name,
      installationDate: AssetSortFieldInput.InstallationDate,
      replacementData: AssetSortFieldInput.ReplacementDate,
      serialNumber: AssetSortFieldInput.SerialNumber,
    };

    return fields[sortBy.key] ?? AssetSortFieldInput.Name;
  },
  toUpdate: (input: AssetFragment): UpdateAssetInput => ({
    id: input.id,
    catalogueItemId: setNullableInput('catalogueItemId', input),
    code: input.code,
    installationDate: setNullableInput('installationDate', input),
    name: input.name,
    replacementDate: setNullableInput('replacementDate', input),
    serialNumber: setNullableInput('serialNumber', input),
    storeId: input.storeId,
  }),
};

export const getAssetQueries = (sdk: Sdk, storeId: string) => ({
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
        key: assetParsers.toSortField(sortBy),
        desc: sortBy.isDesc,
        storeId,
        filter: { ...filterBy, classId: { equalTo: CCE_CLASS_ID } },
      });

      const items = result?.assets;

      return items;
    },
    listAll: async ({ sortBy }: ListParams<AssetFragment>) => {
      const result = await sdk.assets({
        key: assetParsers.toSortField(sortBy),
        desc: sortBy.isDesc,
        storeId,
        filter: { classId: { equalTo: CCE_CLASS_ID } },
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
  update: async (input: AssetFragment): Promise<string> => {
    const result = await sdk.updateAsset({
      input: assetParsers.toUpdate(input),
      storeId,
    });
    const { updateAsset } = result;

    if (updateAsset?.__typename === 'AssetNode') {
      return updateAsset.id;
    }

    throw new Error('Could not update asset');
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
