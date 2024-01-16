import {
  SortBy,
  FilterByWithBoolean,
  StockLineNode,
  StockLineSortFieldInput,
  RecordPatch,
  UpdateStockLineInput,
  setNullableInput,
} from '@openmsupply-client/common';
import { getSdk, StockLineRowFragment } from './operations.generated';
import { Repack } from '../types';

export type StockApi = ReturnType<typeof getSdk>;

const stockLineParsers = {
  toSortField: (sortBy: SortBy<StockLineNode>): StockLineSortFieldInput => {
    switch (sortBy.key) {
      case 'batch':
        return StockLineSortFieldInput.Batch;
      case 'itemCode':
        return StockLineSortFieldInput.ItemCode;
      case 'itemName':
        return StockLineSortFieldInput.ItemName;
      case 'packSize':
        return StockLineSortFieldInput.PackSize;
      case 'supplierName':
        return StockLineSortFieldInput.SupplierName;
      case 'numberOfPacks':
        return StockLineSortFieldInput.NumberOfPacks;
      case 'location':
        return StockLineSortFieldInput.LocationCode;
      case 'expiryDate':
      default: {
        return StockLineSortFieldInput.ExpiryDate;
      }
    }
  },
  toUpdate: (
    patch: RecordPatch<StockLineRowFragment>
  ): UpdateStockLineInput => ({
    id: patch?.id,
    location: setNullableInput('id', patch.location),
    costPricePerPack: patch.costPricePerPack,
    sellPricePerPack: patch.sellPricePerPack,
    expiryDate: patch.expiryDate,
    batch: patch.batch,
    onHold: patch.onHold,
    barcode: patch.barcode,
  }),
};

export const getStockQueries = (stockApi: StockApi, storeId: string) => ({
  get: {
    byId: async (id: string) => {
      const result = await stockApi.stockLine({ id, storeId });
      const stockLine = result?.stockLines.nodes[0];

      if (stockLine?.__typename === 'StockLineNode') {
        return stockLine;
      } else {
        throw new Error('Could not find stock line');
      }
    },
    list: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: {
      first: number;
      offset: number;
      sortBy: SortBy<StockLineNode>;
      filterBy: FilterByWithBoolean | null;
    }): Promise<{
      nodes: StockLineRowFragment[];
      totalCount: number;
    }> => {
      const filter = {
        ...filterBy,
        hasPacksInStore: true,
      };
      const result = await stockApi.stockLines({
        storeId,
        first: first,
        offset: offset,
        key: stockLineParsers.toSortField(sortBy),
        desc: sortBy.isDesc,
        filter,
      });
      const { nodes, totalCount } = result?.stockLines;
      return { nodes, totalCount };
    },
    listAll: async ({
      sortBy,
    }: {
      sortBy: SortBy<StockLineNode>;
    }): Promise<{
      nodes: StockLineRowFragment[];
      totalCount: number;
    }> => {
      const result = await stockApi.stockLines({
        key: stockLineParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        storeId,
      });
      return result?.stockLines;
    },
    repack: async (invoiceId: string) => {
      const result = await stockApi.repack({
        storeId,
        invoiceId,
      });

      if (result.repack.__typename === 'RepackNode') {
        return result.repack;
      }
    },
    repacksByStockLine: async (stockLineId: string) => {
      const result = await stockApi.repacksByStockLine({
        storeId,
        stockLineId,
      });

      return result.repacksByStockLine;
    },
  },
  update: async (patch: RecordPatch<StockLineRowFragment>) => {
    const result =
      (await stockApi.updateStockLine({
        storeId,
        input: stockLineParsers.toUpdate(patch),
      })) || {};

    const { updateStockLine } = result;

    if (updateStockLine?.__typename === 'StockLineNode') {
      return patch;
    }

    throw new Error('Unable to update stock line');
  },
  insertRepack: async (patch: Repack) => {
    const result = await stockApi.insertRepack({
      storeId,
      input: {
        stockLineId: patch.stockLineId ?? '',
        newPackSize: patch.newPackSize ?? 0,
        numberOfPacks: patch.numberOfPacks ?? 0,
        newLocationId: patch.newLocationId ?? undefined,
      },
    });

    return result.insertRepack;
  },
});
