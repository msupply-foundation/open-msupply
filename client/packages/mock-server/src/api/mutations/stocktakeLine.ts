import { ResolverService } from './../resolvers/index';
import { ResolvedStocktakeLine } from './../../data/types';
import {
  UpdateStocktakeLineInput,
  InsertStocktakeLineInput,
  DeleteStocktakeLineInput,
  DeleteResponse,
} from './../../../../common/src/types/schema';
import { db } from './../../data/database';

export const StocktakeLineMutation = {
  update: (input: UpdateStocktakeLineInput): ResolvedStocktakeLine => {
    db.stocktakeLine.update(input);
    const resolvedReq = ResolverService.stocktakeLine.byId(input.id);
    return resolvedReq;
  },
  insert: (input: InsertStocktakeLineInput): ResolvedStocktakeLine => {
    db.stocktakeLine.insert(input);
    const resolvedReq = ResolverService.stocktakeLine.byId(input.id);
    return resolvedReq;
  },
  delete: (input: DeleteStocktakeLineInput): DeleteResponse => {
    return db.stocktakeLine.delete(input);
  },
};
