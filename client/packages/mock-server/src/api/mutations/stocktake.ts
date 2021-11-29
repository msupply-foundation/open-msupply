import { ResolvedStocktake } from './../../data/types';
import { ResolverService } from './../resolvers/index';
import { db } from './../../data/database';
import {
  InsertStocktakeInput,
  UpdateStocktakeInput,
  DeleteStocktakeInput,
  DeleteResponse,
} from '@openmsupply-client/common/src/types/schema';

export const StocktakeMutation = {
  update: (input: UpdateStocktakeInput): ResolvedStocktake => {
    db.stocktake.update(input);
    const resolvedStocktake = ResolverService.stocktake.byId(input.id);
    return resolvedStocktake;
  },
  insert: (input: InsertStocktakeInput): ResolvedStocktake => {
    db.stocktake.insert(input);
    const resolvedStocktake = ResolverService.stocktake.byId(input.id);
    return resolvedStocktake;
  },
  delete: (input: DeleteStocktakeInput): DeleteResponse => {
    return db.stocktake.delete(input);
  },
};
