import { createListResponse } from './utils';
import { getDataSorter } from './../../../../common/src/utils/arrays/sorters';
import { db } from './../../data/database';
import { StocktakeListParameters } from '@openmsupply-client/common/src/types/schema';
import { ResolvedStocktake, ListResponse } from './../../data/types';

export const StocktakeResolver = {
  byId: (id: string): ResolvedStocktake => {
    const stocktake = db.stocktake.get.byId(id);
    return { __typename: 'StocktakeNode', ...stocktake };
  },
  list: (
    params: StocktakeListParameters
  ): ListResponse<ResolvedStocktake, 'StocktakeConnector'> => {
    const stocktakes = db.stocktake.get.list();

    const { filter, page = {}, sort = [] } = params ?? {};

    const { offset = 0, first = 20 } = page ?? {};
    const { key = 'comment', desc = false } = sort && sort[0] ? sort[0] : {};

    const resolved = stocktakes.map(requisition => {
      return StocktakeResolver.byId(requisition.id);
    });

    let filtered = resolved;
    if (filter) {
      if (filter.description) {
        filtered = filtered.filter(stocktake => {
          return stocktake.description === filter.description?.equalTo;
        });
      }
    }

    const paged = filtered.slice(offset ?? 0, (offset ?? 0) + (first ?? 20));

    if (key) {
      paged.sort(getDataSorter(key, !!desc));
    }

    return createListResponse(filtered.length, paged, 'StocktakeConnector');
  },
};
