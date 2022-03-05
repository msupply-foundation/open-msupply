import {
  generateUUID,
  formatNaiveDate,
  InsertStocktakeLineInput,
  UpdateStocktakeLineInput,
  UpdateStocktakeInput,
  RecordPatch,
  SortBy,
  FilterBy,
  StocktakeSortFieldInput,
} from '@openmsupply-client/common';
import {
  Sdk,
  StocktakeFragment,
  StocktakeRowFragment,
  StocktakeLineFragment,
} from './operations.generated';
import { DraftStocktakeLine } from './../DetailView/modal/StocktakeLineEdit/hooks';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<StocktakeRowFragment>;
  filterBy: FilterBy | null;
};

const stocktakeParser = {
  toUpdate: (patch: RecordPatch<StocktakeFragment>): UpdateStocktakeInput => {
    return {
      description: patch.description,
      status: patch.status,
      comment: patch.comment,
      id: patch.id,
      isLocked: patch.isLocked,
    };
  },
  line: {
    toUpdate: (line: DraftStocktakeLine): UpdateStocktakeLineInput => {
      return {
        batch: line.batch ?? '',
        packSize: line.packSize ?? 1,
        costPricePerPack: line.costPricePerPack,
        countedNumberOfPacks: line.countedNumberOfPacks,
        sellPricePerPack: line.sellPricePerPack,
        id: line.id,

        expiryDate: line.expiryDate
          ? formatNaiveDate(new Date(line.expiryDate))
          : undefined,
      };
    },
    toInsert: (line: DraftStocktakeLine): InsertStocktakeLineInput => {
      return {
        batch: line.batch ?? '',
        packSize: line.packSize ?? 1,
        costPricePerPack: line.costPricePerPack,
        countedNumberOfPacks: line.countedNumberOfPacks,
        id: line.id,
        itemId: line.itemId,
        sellPricePerPack: line.sellPricePerPack,
        stocktakeId: line.stocktakeId,
        expiryDate: line.expiryDate
          ? formatNaiveDate(new Date(line.expiryDate))
          : undefined,
      };
    },
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
        return result.stocktakes;
      },
    byId: async (id: string): Promise<StocktakeFragment> => {
      const result = await sdk.stocktake({ stocktakeId: id, storeId });

      if (result.stocktake.__typename === 'StocktakeNode') {
        return result.stocktake;
      }

      throw new Error('Could not find stocktake!');
    },
    byNumber: async (stocktakeNumber: string): Promise<StocktakeFragment> => {
      const result = await sdk.stocktakeByNumber({
        stocktakeNumber: Number(stocktakeNumber),
        storeId,
      });

      if (result.stocktakeByNumber.__typename === 'StocktakeNode') {
        return result.stocktakeByNumber;
      }

      throw new Error('Could not find stocktake!');
    },
  },
  updateLines: async (draftStocktakeLines: DraftStocktakeLine[]) => {
    const input = {
      storeId,
      insertStocktakeLines: draftStocktakeLines
        .filter(({ isCreated }) => isCreated)
        .map(stocktakeParser.line.toInsert),
      updateStocktakeLines: draftStocktakeLines
        .filter(({ isCreated, isUpdated }) => !isCreated && isUpdated)
        .map(stocktakeParser.line.toUpdate),
    };

    const result = await sdk.upsertStocktakeLines(input);

    return result;
  },
  update: async (
    patch: RecordPatch<StocktakeFragment>
  ): Promise<UpdateStocktakeInput> => {
    const input = stocktakeParser.toUpdate(patch);
    const result = await sdk.updateStocktake({ input, storeId });

    const { updateStocktake } = result;

    if (updateStocktake.__typename === 'StocktakeNode') {
      return input;
    }

    throw new Error('Could not update stocktake');
  },
  deleteStocktakes: async (stocktakes: StocktakeRowFragment[]) => {
    const result = await sdk.deleteStocktakes({
      ids: stocktakes.map(stocktake => ({ id: stocktake.id })),
      storeId,
    });
    const { batchStocktake } = result;
    if (batchStocktake.__typename === 'BatchStocktakeResponses') {
      return batchStocktake;
    }

    throw new Error('Unknown');
  },
  deleteLines: async (stocktakeLines: StocktakeLineFragment[]) => {
    const input = { storeId, deleteStocktakeLines: stocktakeLines };
    const result = await sdk.upsertStocktakeLines(input);
    return result;
  },
  insertStocktake: async () => {
    const result = await sdk.insertStocktake({
      input: {
        id: generateUUID(),
      },
      storeId,
    });
    const { insertStocktake } = result;
    if (insertStocktake.__typename === 'StocktakeNode') {
      return insertStocktake;
    }

    throw new Error('Could not create stocktake');
  },
});
