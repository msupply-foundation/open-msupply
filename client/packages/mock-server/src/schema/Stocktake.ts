import { MutationService } from './../api/mutations/index';
import { ResolverService } from './../api/resolvers/index';
import {
  StocktakeResponse,
  StocktakesResponse,
  StocktakeListParameters,
} from './../../../common/src/types/schema';
import {
  InsertStocktakeInput,
  UpdateStocktakeInput,
  DeleteStocktakeInput,
  InsertStocktakeResponse,
  UpdateStocktakeResponse,
  DeleteStocktakeResponse,
} from '@openmsupply-client/common/src/types/schema';

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

const MutationResolvers = {
  updateStocktake: (
    _: unknown,
    { input }: { input: UpdateStocktakeInput }
  ): UpdateStocktakeResponse => {
    return MutationService.stocktake.update(input);
  },
  insertStocktake: (
    _: unknown,
    { input }: { input: InsertStocktakeInput }
  ): InsertStocktakeResponse => {
    return MutationService.stocktake.insert(input);
  },
  deleteStocktake: (
    _: unknown,
    { input }: { input: DeleteStocktakeInput }
  ): DeleteStocktakeResponse => {
    return {
      __typename: 'DeleteResponse',
      ...MutationService.stocktake.delete(input),
    };
  },
};

export const Stocktake = {
  QueryResolvers,
  MutationResolvers,
};
