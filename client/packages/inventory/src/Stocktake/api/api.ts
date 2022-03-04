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
  getSdk,
  StocktakeFragment,
  StocktakeRowFragment,
  StocktakeLineFragment,
} from './operations.generated';
import { DraftStocktakeLine } from './../DetailView/modal/StocktakeLineEdit/hooks';

export type StocktakeApi = ReturnType<typeof getStocktakeQueries> & {
  storeId: string;
};
export type StocktakeQueries = ReturnType<typeof getSdk>;

const stocktakeParsers = {
  stocktake: {
    toUpdateInput: (
      patch: RecordPatch<StocktakeFragment>
    ): UpdateStocktakeInput => {
      return {
        description: patch.description,
        status: patch.status,
        comment: patch.comment,
        id: patch.id,
      };
    },
  },
  line: {
    toUpdateLineInput: (line: DraftStocktakeLine): UpdateStocktakeLineInput => {
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
    toInsertInput: (line: DraftStocktakeLine): InsertStocktakeLineInput => {
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

export const getStocktakeQueries = (
  queries: StocktakeQueries,
  storeId: string
) => ({
  get: {
    list:
      ({
        first,
        offset,
        sortBy,
        filter,
      }: {
        first: number;
        offset: number;
        sortBy: SortBy<StocktakeRowFragment>;
        filter: FilterBy | null;
      }) =>
      async () => {
        const result = await queries.stocktakes({
          storeId,
          page: { offset, first },
          sort: {
            key: sortBy.key as StocktakeSortFieldInput,
            desc: !!sortBy.isDesc,
          },
          filter: { ...filter },
        });
        return result.stocktakes;
      },
    byId: async (id: string): Promise<StocktakeFragment> => {
      const result = await queries.stocktake({ stocktakeId: id, storeId });

      if (result.stocktake.__typename === 'StocktakeNode') {
        return result.stocktake;
      }

      throw new Error('Could not find stocktake!');
    },
    byNumber: async (stocktakeNumber: number): Promise<StocktakeFragment> => {
      const result = await queries.stocktakeByNumber({
        stocktakeNumber,
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
        .map(stocktakeParsers.line.toInsertInput),
      updateStocktakeLines: draftStocktakeLines
        .filter(({ isCreated, isUpdated }) => !isCreated && isUpdated)
        .map(stocktakeParsers.line.toUpdateLineInput),
    };

    const result = await queries.upsertStocktakeLines(input);

    return result;
  },
  update: async (
    patch: RecordPatch<StocktakeFragment>
  ): Promise<UpdateStocktakeInput> => {
    const input = stocktakeParsers.stocktake.toUpdateInput(patch);
    const result = await queries.updateStocktake({ input, storeId });

    const { updateStocktake } = result;

    if (updateStocktake.__typename === 'StocktakeNode') {
      return input;
    }

    throw new Error('Could not update stocktake');
  },
  deleteStocktakes: async (stocktakes: StocktakeRowFragment[]) => {
    const result = await queries.deleteStocktakes({
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
    const result = await queries.upsertStocktakeLines(input);
    return result;
  },
  insertStocktake: async () => {
    const result = await queries.insertStocktake({
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
