import { ResolverService } from './../api/resolvers/index';
import {
  StocktakeResponse,
  StocktakesResponse,
  StocktakeListParameters,
} from './../../../common/src/types/schema';

const QueryResolvers = {
  requisition: (id: string): StocktakeResponse => {
    return ResolverService.stocktake.byId(id);
  },
  stocktakes: (
    _: unknown,
    vars: { params: StocktakeListParameters }
  ): StocktakesResponse => {
    return ResolverService.stocktake.list(vars.params);
  },
};

const MutationResolvers = {};

export const Stocktake = {
  QueryResolvers,
  MutationResolvers,
};
