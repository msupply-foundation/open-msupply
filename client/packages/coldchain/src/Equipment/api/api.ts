import {
  SortBy,
  FilterByWithBoolean,
  AssetSortFieldInput,
  InsertAssetInput,
  UpdateAssetInput,
  setNullableInput,
  InsertAssetLogInput,
  AssetLogSortFieldInput,
} from '@openmsupply-client/common';
import { Sdk, AssetFragment } from './operations.generated';
import { CCE_CLASS_ID } from '../utils';
import { DraftAsset } from '../types';

export type ListParams<T> = {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
  filterBy?: FilterByWithBoolean | null;
};

export type InsertAsset = Partial<DraftAsset> & {
  categoryId?: string;
  typeId?: string;
  classId?: string;
};

const assetParsers = {
  toSortField: (sortBy: SortBy<AssetFragment>) => {
    const fields: Record<string, AssetSortFieldInput> = {
      installationDate: AssetSortFieldInput.InstallationDate,
      replacementData: AssetSortFieldInput.ReplacementDate,
      serialNumber: AssetSortFieldInput.SerialNumber,
      store: AssetSortFieldInput.Store,
      assetNumber: AssetSortFieldInput.AssetNumber,
    };

    return fields[sortBy.key] ?? AssetSortFieldInput.InstallationDate;
  },
  toInsert: (input: InsertAsset): InsertAssetInput => ({
    id: input.id ?? '',
    assetNumber: input.assetNumber ?? '',
    catalogueItemId: input.catalogueItemId,
    categoryId: input.categoryId,
    classId: input.classId,
    installationDate: input.installationDate,
    notes: input.notes,
    replacementDate: input.replacementDate,
    serialNumber: input.serialNumber,
    storeId: input.store?.id,
    typeId: input.typeId,
    properties: JSON.stringify(input.parsedProperties),
    donorNameId: input.donorNameId,
    warrantyStart: input.warrantyStart,
    warrantyEnd: input.warrantyEnd,
    needsReplacement: input.needsReplacement,
  }),
  toUpdate: (input: Partial<DraftAsset>): UpdateAssetInput => ({
    id: input.id ?? '',
    catalogueItemId: setNullableInput('catalogueItemId', input),
    assetNumber: input.assetNumber,
    installationDate: setNullableInput('installationDate', input),
    notes: input.notes,
    replacementDate: setNullableInput('replacementDate', input),
    serialNumber: setNullableInput('serialNumber', input),
    storeId: setNullableInput('id', input.store),
    locationIds: input.locationIds,
    properties: JSON.stringify(input.parsedProperties),
    donorNameId: setNullableInput('donorNameId', input),
    warrantyStart: setNullableInput('warrantyStart', input),
    warrantyEnd: setNullableInput('warrantyEnd', input),
    needsReplacement: input.needsReplacement,
  }),
  toLogInsert: (input: Partial<InsertAssetLogInput>): InsertAssetLogInput => ({
    id: input.id ?? '',
    assetId: input.assetId ?? '',
    comment: input.comment,
    reasonId: input.reasonId,
    status: input.status,
    type: input.type,
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
    list: async (
      { first, offset, sortBy, filterBy }: ListParams<AssetFragment>,
      storeCode?: string
    ) => {
      const result = await sdk.assets({
        first,
        offset,
        key: assetParsers.toSortField(sortBy),
        desc: sortBy.isDesc,
        storeId,
        filter: {
          ...filterBy,
          ...(storeCode ? { store: { equalTo: storeCode } } : {}),
          classId: { equalTo: CCE_CLASS_ID },
        },
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
    logs: async (assetId: string) => {
      const filter = { assetId: { equalTo: assetId } };
      const sort = { key: AssetLogSortFieldInput.LogDatetime, desc: true };
      const result = await sdk.assetLogs({ filter, sort, storeId });

      const items = result?.assetLogs;

      return items;
    },
    labelPrinterSettings: async () => {
      const result = await sdk.labelPrinterSettings();
      return result.labelPrinterSettings;
    },
  },
  insert: async (input: Partial<DraftAsset>): Promise<string> => {
    const result = await sdk.insertAsset({
      input: assetParsers.toInsert(input),
      storeId,
    });
    const { insertAsset } = result;

    if (insertAsset?.__typename === 'AssetNode') {
      return insertAsset.id;
    }

    throw new Error('Could not insert asset');
  },
  update: async (input: Partial<DraftAsset>): Promise<string> => {
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
  insertLog: async (
    input: Partial<InsertAssetLogInput>
  ): Promise<{ id: string; assetId: string }> => {
    const result = await sdk.insertAssetLog({
      input: assetParsers.toLogInsert(input),
      storeId,
    });
    const { insertAssetLog } = result;

    if (insertAssetLog?.__typename === 'AssetLogNode') {
      const { id, assetId } = insertAssetLog;
      return { id, assetId };
    }

    throw new Error('Could not insert asset log');
  },
});
