import {
  SortBy,
  FilterBy,
  AssetSortFieldInput,
  AssetLogFilterInput,
  InsertAssetInput,
  UpdateAssetInput,
  setNullableInput,
  InsertAssetLogInput,
  AssetLogSortFieldInput,
  Gs1DataElement,
} from '@openmsupply-client/common';
import { Sdk, AssetFragment } from './operations.generated';
import { CCE_CLASS_ID } from '../utils';
import { DraftAsset } from '../types';
import { Gs1Barcode } from 'gs1-barcode-parser-mod';

export type ListParams<T> = {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
  filterBy?: FilterBy | null;
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
    lockedFieldsJson: input.lockedFields
      ? JSON.stringify(input.lockedFields)
      : null,
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
    logDatetime: input.logDatetime,
    reasonId: input.reasonId,
    status: input.status,
    type: input.type,
  }),
};

// What this register is reading, in one place: the class pinning that makes it
// the cold chain register, the screen's own filters, and the store restriction
// the Cold chain destination carries (the server scopes neither). The EXPORT
// calls this with the same destination scope as the list, so the file is what
// the screen shows (issue #693).
//
// ⚠️ `storeCode` never arrives. Its caller derives the flag from
// `useCentralServerCallback()`, which returns an OBJECT of callbacks and is
// therefore always truthy, so the ternary in useAssets.ts always picks
// `undefined` and the `store` clause below is never built — on any site. The
// register is unscoped everywhere, and on a non-central site it is unscoped
// without even the Store column that would name the owner.
//
// Left as-is here deliberately. It is captured as current behaviour in the new
// front end's spec (frontend/spec/cold-chain-equipment/contract.md § the two
// destinations, "wire trap — the non-central store-code restriction is dead
// code", confirmed live), and that front end was built to match it. Making the
// restriction fire would re-scope the list on every non-central site and put
// the two apps out of step — a product decision, not a comment fix.
const assetListFilter = (
  storeId: string,
  filterBy?: FilterBy | null,
  storeCode?: string,
  isColdChain?: boolean
) => ({
  ...filterBy,
  ...(storeCode ? { store: { equalTo: storeCode } } : {}),
  ...(isColdChain ? { storeId: { equalTo: storeId } } : {}),
  classId: { equalTo: CCE_CLASS_ID },
});

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
    byGs1Elements: async (data: Gs1Barcode) => {
      const dataElements: Gs1DataElement[] = data.parsedCodeItems.map(item => {
        return { ai: item.ai, data: item.data.toString() };
      });
      const { assetFromGs1Data } = await sdk.assetFromGs1Data({
        storeId,
        data: dataElements,
      });
      return assetFromGs1Data;
    },
    list: async (
      { first, offset, sortBy, filterBy }: ListParams<AssetFragment>,
      storeCode?: string,
      isColdChain?: boolean
    ) => {
      const result = await sdk.assets({
        first,
        offset,
        key: assetParsers.toSortField(sortBy),
        desc: sortBy.isDesc,
        storeId,
        filter: assetListFilter(storeId, filterBy, storeCode, isColdChain),
      });

      const items = result?.assets;

      return items;
    },
    // The export. The list's own filters and the list's own store scope,
    // unpaginated — so the file is what the screen shows (issue #693).
    listAll: async (
      { sortBy, filterBy }: ListParams<AssetFragment>,
      isColdChain?: boolean
    ) => {
      const result = await sdk.assets({
        key: assetParsers.toSortField(sortBy),
        desc: sortBy.isDesc,
        storeId,
        // The export carries the destination's store scope, exactly as the
        // list does — `storeCode` stays out because it is the dead one above.
        filter: assetListFilter(storeId, filterBy, undefined, isColdChain),
      });

      const items = result?.assets;

      return items;
    },
    logs: async (
      assetId: string,
      additionalFilter?: Partial<AssetLogFilterInput>
    ) => {
      const filter: AssetLogFilterInput = {
        assetId: { equalTo: assetId },
        ...additionalFilter,
      };
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
