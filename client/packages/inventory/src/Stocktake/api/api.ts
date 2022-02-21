import { DraftStocktakeLine } from './../DetailView/modal/StocktakeLineEdit/hooks';
import {
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
} from './operations.generated';

export type StocktakeApi = ReturnType<typeof getSdk>;

const createUpdateStocktakeInput = (
  patch: RecordPatch<StocktakeFragment>
): UpdateStocktakeInput => {
  return {
    description: patch.description,
    status: patch.status,
    comment: patch.comment,
    id: patch.id,
  };
};

const createUpdateStocktakeLineInput = (
  line: DraftStocktakeLine
): UpdateStocktakeLineInput => {
  return {
    batch: line.batch ?? '',
    costPricePerPack: line.costPricePerPack,
    sellPricePerPack: line.sellPricePerPack,
    id: line.id,
    countedNumberOfPacks: line.countedNumberOfPacks,
    expiryDate: line.expiryDate ? formatNaiveDate(line.expiryDate) : undefined,
  };
};

const createInsertStocktakeLineInput = (
  line: DraftStocktakeLine
): InsertStocktakeLineInput => {
  return {
    batch: line.batch ?? '',
    costPricePerPack: line.costPricePerPack,
    countedNumberOfPacks: line.countedNumberOfPacks,
    id: line.id,
    itemId: line.itemId,
    sellPricePerPack: line.sellPricePerPack,
    stocktakeId: line.stocktakeId,
    expiryDate: line.expiryDate ? formatNaiveDate(line.expiryDate) : undefined,
  };
};

export const StocktakeQueries = {
  get: {
    list:
      (
        api: StocktakeApi,
        storeId: string,
        {
          first,
          offset,
          sortBy,
          filter,
        }: {
          first: number;
          offset: number;
          sortBy: SortBy<StocktakeRowFragment>;
          filter: FilterBy | null;
        }
      ) =>
      async () => {
        const result = await api.stocktakes({
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
    byId:
      (api: StocktakeApi, storeId: string) =>
      async (id: string): Promise<StocktakeFragment> => {
        const result = await api.stocktake({ stocktakeId: id, storeId });

        if (result.stocktake.__typename === 'StocktakeNode') {
          return result.stocktake;
        }

        throw new Error('Could not find stocktake!');
      },
  },
  updateLines:
    (api: StocktakeApi, storeId: string) =>
    async (draftStocktakeLines: DraftStocktakeLine[]) => {
      const input = {
        storeId,
        insertStocktakeLines: draftStocktakeLines
          .filter(({ isCreated }) => isCreated)
          .map(createInsertStocktakeLineInput),
        updateStocktakeLines: draftStocktakeLines
          .filter(({ isCreated, isUpdated }) => !isCreated && isUpdated)
          .map(createUpdateStocktakeLineInput),
      };

      const result = await api.upsertStocktakeLines(input);

      return result;
    },
  update:
    (api: StocktakeApi, storeId: string) =>
    async (
      patch: RecordPatch<StocktakeFragment>
    ): Promise<UpdateStocktakeInput> => {
      const input = createUpdateStocktakeInput(patch);
      const result = await api.updateStocktake({ input, storeId });

      const { updateStocktake } = result;

      if (updateStocktake.__typename === 'StocktakeNode') {
        return input;
      }

      throw new Error('Could not update stocktake');
    },
  deleteStocktakes:
    (api: StocktakeApi, storeId: string) =>
    async (stocktakes: StocktakeRowFragment[]) => {
      const result = await api.deleteStocktakes({
        ids: stocktakes.map(stocktake => ({ id: stocktake.id })),
        storeId,
      });
      const { batchStocktake } = result;
      if (batchStocktake.__typename === 'BatchStocktakeResponses') {
        return batchStocktake;
      }

      throw new Error('Unknown');
    },
};
