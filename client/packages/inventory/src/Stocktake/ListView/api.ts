import {
  StocktakeSortFieldInput,
  StocktakesQuery,
  UpdateStocktakeInput,
  OmSupplyApi,
  ListApi,
  StocktakeListParameters,
  SortBy,
} from '@openmsupply-client/common/';
import { StocktakeRow } from '../../types';

const onRead =
  (omSupplyApi: OmSupplyApi) =>
  async (
    queryParams: StocktakeListParameters
  ): Promise<{ nodes: StocktakeRow[]; totalCount: number }> => {
    const result = await omSupplyApi.stocktakes({
      params: queryParams,
    });

    const Stocktakes = stocktakesGuard(result);
    const { nodes } = Stocktakes;

    return { nodes, totalCount: Stocktakes.totalCount };
  };

const getSortKey = (): StocktakeSortFieldInput => {
  return StocktakeSortFieldInput.Description;
};

const getSortDesc = (sortBy: SortBy<StocktakeRow>): boolean => {
  return !!sortBy.isDesc;
};

const stocktakesGuard = (StocktakesQuery: StocktakesQuery) => {
  if (StocktakesQuery.stocktakes.__typename === 'StocktakeConnector') {
    return StocktakesQuery.stocktakes;
  }

  throw new Error('Could not fetch Stocktakes');
};

const onDelete =
  (api: OmSupplyApi) =>
  async (Stocktakes: StocktakeRow[]): Promise<string[]> => {
    const result = await api.deleteStocktakes({
      ids: Stocktakes.map(invoice => ({ id: invoice.id })),
    });
    const { batchStocktake } = result;
    if (batchStocktake.deleteStocktakes) {
      return batchStocktake.deleteStocktakes.map(({ id }) => id);
    }
    throw new Error('Unknown');
  };

const stocktakeToInput = (StocktakeRow: StocktakeRow): UpdateStocktakeInput => {
  return {
    ...StocktakeRow,
  };
};

export const onUpdate =
  (api: OmSupplyApi) =>
  async (patch: Partial<StocktakeRow> & { id: string }): Promise<string> => {
    const result = await api.updateStocktake({
      input: stocktakeToInput(patch),
    });

    const { updateStocktake } = result;

    if (updateStocktake.__typename === 'StocktakeNode') {
      return updateStocktake.id;
    }

    throw new Error('Unable to update Stocktake');
  };

export const onCreate =
  (api: OmSupplyApi) =>
  async (Stocktake: Partial<StocktakeRow>): Promise<string> => {
    const result = await api.insertStocktake({
      input: { id: Stocktake.id ?? '' },
    });

    const { insertStocktake } = result;

    if (insertStocktake.__typename === 'StocktakeNode') {
      return insertStocktake.id;
    }

    throw new Error('Could not create Stocktake');
  };

export const getStocktakeListViewApi = (
  omSupplyApi: OmSupplyApi
): ListApi<StocktakeRow> => ({
  onRead: ({ first, offset, sortBy, filterBy }) => {
    const queryParams: StocktakeListParameters = {
      page: { first, offset },
      filter: filterBy,
      sort: [
        {
          key: getSortKey(),
          desc: getSortDesc(sortBy),
        },
      ],
    };

    const onReadFn = onRead(omSupplyApi);
    return () => onReadFn(queryParams);
  },
  onDelete: onDelete(omSupplyApi),
  onUpdate: onUpdate(omSupplyApi),
  onCreate: onCreate(omSupplyApi),
});
