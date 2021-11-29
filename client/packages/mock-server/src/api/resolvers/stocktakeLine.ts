import { ResolvedStocktakeLine, ListResponse } from './../../data/types';
import { db } from '../../data/database';
import { createListResponse } from './utils';

export const StocktakeLineResolver = {
  byId: (id: string): ResolvedStocktakeLine => {
    const stocktakeLine = db.stocktakeLine.get.byId(id);
    if (!stocktakeLine) {
      throw new Error(`StocktakeLine with id ${id} not found`);
    }

    return {
      ...stocktakeLine,
      __typename: 'StocktakeLineNode',
    };
  },
  byStocktakeId: (
    StocktakeId: string
  ): ListResponse<ResolvedStocktakeLine, 'StocktakeLineConnector'> => {
    const StocktakeLines = db.stocktakeLine.get.byStocktakeId(StocktakeId);

    const resolvedLines = StocktakeLines.map(StocktakeLine =>
      StocktakeLineResolver.byId(StocktakeLine.id)
    );

    return createListResponse(
      resolvedLines.length,
      resolvedLines,
      'StocktakeLineConnector'
    );
  },
};
