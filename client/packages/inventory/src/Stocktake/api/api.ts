import {
  FnUtils,
  Formatter,
  InsertStocktakeLineInput,
  UpdateStocktakeLineInput,
  UpdateStocktakeInput,
  RecordPatch,
  SortBy,
  FilterBy,
  StocktakeSortFieldInput,
  DeleteStocktakeLineInput,
  StocktakeNodeStatus,
  UpdateStocktakeStatusInput,
} from '@openmsupply-client/common';
import {
  Sdk,
  StocktakeFragment,
  StocktakeRowFragment,
  StocktakeLineFragment,
} from './operations.generated';
import { DraftStocktakeLine } from './../DetailView/modal/StocktakeLineEdit';
import { StockLineFragment } from '@openmsupply-client/system';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<StocktakeRowFragment>;
  filterBy: FilterBy | null;
};

const stocktakeParser = {
  toUpdate: (patch: RecordPatch<StocktakeFragment>): UpdateStocktakeInput => ({
    description: patch.description,
    comment: patch.comment,
    id: patch.id,
    isLocked: patch.isLocked,
    stocktakeDate: patch.stocktakeDate
      ? Formatter.naiveDate(new Date(patch.stocktakeDate))
      : undefined,
    status:
      patch.status === StocktakeNodeStatus.Finalised
        ? UpdateStocktakeStatusInput.Finalised
        : undefined,
  }),
  line: {
    toDelete: (line: DraftStocktakeLine): DeleteStocktakeLineInput => ({
      id: line.id,
    }),
    toUpdate: (line: DraftStocktakeLine): UpdateStocktakeLineInput => ({
      locationId: line.location?.id,
      batch: line.batch ?? '',
      packSize: line.packSize ?? 1,
      costPricePerPack: line.costPricePerPack,
      countedNumberOfPacks: line.countedNumberOfPacks,
      sellPricePerPack: line.sellPricePerPack,
      id: line.id,
      expiryDate: line.expiryDate
        ? Formatter.naiveDate(new Date(line.expiryDate))
        : undefined,
    }),
    toInsert: (line: DraftStocktakeLine): InsertStocktakeLineInput => ({
      locationId: line.location?.id,
      batch: line.batch ?? '',
      packSize: line.packSize ?? 1,
      costPricePerPack: line.costPricePerPack,
      countedNumberOfPacks: line.countedNumberOfPacks,
      id: line.id,
      itemId: !line.stockLine?.id ? line.itemId : undefined,
      sellPricePerPack: line.sellPricePerPack,
      stockLineId: line.stockLine?.id,
      stocktakeId: line.stocktakeId,
      expiryDate: line.expiryDate
        ? Formatter.naiveDate(new Date(line.expiryDate))
        : undefined,
    }),
  },
};

export const getStocktakeQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list:
      ({ first, offset, sortBy, filterBy }: ListParams) =>
      async () => {
        const result = await sdk.stocktakes({
          storeId,
          page: { offset, first },
          sort: {
            key: sortBy.key as StocktakeSortFieldInput,
            desc: !!sortBy.isDesc,
          },
          filter: filterBy,
        });
        return result?.stocktakes;
      },
    listAll:
      ({ sortBy }: { sortBy: SortBy<StocktakeRowFragment> }) =>
      async () => {
        const result = await sdk.stocktakes({
          storeId,
          sort: {
            key: sortBy.key as StocktakeSortFieldInput,
            desc: !!sortBy.isDesc,
          },
        });
        return result?.stocktakes;
      },
    byId: async (id: string): Promise<StocktakeFragment> => {
      const result = await sdk.stocktake({ stocktakeId: id, storeId });

      if (result?.stocktake?.__typename === 'StocktakeNode') {
        return result?.stocktake;
      }

      throw new Error('Could not find stocktake!');
    },
    byNumber: async (stocktakeNumber: string): Promise<StocktakeFragment> => {
      const result = await sdk.stocktakeByNumber({
        stocktakeNumber: Number(stocktakeNumber),
        storeId,
      });

      if (result?.stocktakeByNumber?.__typename === 'StocktakeNode') {
        return result?.stocktakeByNumber;
      }

      throw new Error('Could not find stocktake!');
    },
  },
  updateLines: async (draftStocktakeLines: DraftStocktakeLine[]) => {
    const result = await sdk.upsertStocktakeLines({
      storeId,
      deleteStocktakeLines: draftStocktakeLines
        .filter(
          ({ countThisLine, isUpdated, isCreated }) =>
            !isCreated && isUpdated && !countThisLine
        )
        .map(stocktakeParser.line.toDelete),
      insertStocktakeLines: draftStocktakeLines
        .filter(({ isCreated, countThisLine }) => isCreated && countThisLine)
        .map(stocktakeParser.line.toInsert),
      updateStocktakeLines: draftStocktakeLines
        .filter(
          ({ countThisLine, isCreated, isUpdated }) =>
            !isCreated && isUpdated && countThisLine
        )
        .map(stocktakeParser.line.toUpdate),
    });

    return result;
  },
  update: async (
    patch: RecordPatch<StocktakeFragment>
  ): Promise<UpdateStocktakeInput> => {
    const input = stocktakeParser.toUpdate(patch);
    const result = (await sdk.updateStocktake({ input, storeId })) || {};

    const { updateStocktake } = result;

    if (updateStocktake?.__typename === 'StocktakeNode') {
      return input;
    }

    throw new Error('Could not update stocktake');
  },
  deleteStocktakes: async (stocktakes: StocktakeRowFragment[]) => {
    const result =
      (await sdk.deleteStocktakes({
        ids: stocktakes.map(stocktake => ({ id: stocktake.id })),
        storeId,
      })) || {};
    const { batchStocktake } = result;
    if (batchStocktake?.__typename === 'BatchStocktakeResponse') {
      return batchStocktake;
    }

    throw new Error('Unknown');
  },
  deleteLines: async (stocktakeLines: StocktakeLineFragment[]) => {
    const input = { storeId, deleteStocktakeLines: stocktakeLines };
    const result = await sdk.upsertStocktakeLines(input);
    return result;
  },

  insertStocktake: async ({
    description,
    items,
  }: {
    description: string;
    items?: { itemId: string; stockLines?: StockLineFragment[] }[];
  }) => {
    const result =
      (await sdk.insertStocktake({
        input: {
          id: FnUtils.generateUUID(),
        },
        storeId,
      })) || {};
    const { insertStocktake } = result;

    if (insertStocktake?.__typename === 'StocktakeNode') {
      if (items) {
        const insertStocktakeLines = getInsertStocktakeLines(
          insertStocktake.id,
          items
        );
        await sdk.upsertStocktakeLines({
          storeId,
          insertStocktakeLines,
        });
      }
      const input = {
        id: insertStocktake.id,
        description,
      };
      sdk.updateStocktake({ input, storeId });
      return insertStocktake;
    }

    throw new Error('Could not create stocktake');
  },
});

const getInsertStocktakeLines = (
  stocktakeId: string,
  items: { itemId: string; stockLines?: StockLineFragment[] | undefined }[]
) => {
  const insertStocktakeLines = [] as InsertStocktakeLineInput[];
  items.forEach(item => {
    const { itemId, stockLines } = item;
    if (stockLines && stockLines.length > 0) {
      stockLines.forEach(stockLine => {
        insertStocktakeLines.push({
          id: FnUtils.generateUUID(),
          stocktakeId,
          stockLineId: stockLine.id,
          batch: stockLine.batch,
          costPricePerPack: stockLine.costPricePerPack,
          expiryDate: stockLine.expiryDate,
          packSize: stockLine.packSize,
          sellPricePerPack: stockLine.sellPricePerPack,
        });
      });
    } else {
      insertStocktakeLines.push({
        id: FnUtils.generateUUID(),
        stocktakeId,
        itemId,
      });
    }
  });
  return insertStocktakeLines;
};
