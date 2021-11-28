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
  DeleteResponse,
  InsertStocktakeResponseWithId,
  UpdateStocktakeResponseWithId,
  DeleteStocktakeResponseWithId,
  InsertStocktakeLineResponseWithId,
  UpdateStocktakeLineResponseWithId,
  DeleteStocktakeLineResponseWithId,
  BatchStocktakeInput,
  BatchStocktakeResponse,
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
  ): DeleteResponse => {
    return {
      __typename: 'DeleteResponse',
      ...MutationService.stocktake.delete(input),
    };
  },
  batchStocktake: (
    _: unknown,
    vars: BatchStocktakeInput
  ): BatchStocktakeResponse => {
    const response: BatchStocktakeResponse = {
      __typename: 'BatchStocktakeResponse',
    };

    if (vars.insertStocktakes) {
      response.insertStocktakes = vars.insertStocktakes.map(input => {
        const regularInsertResponse = MutationResolvers.insertStocktake(_, {
          input,
        });
        const batchInsertResponse: InsertStocktakeResponseWithId = {
          __typename: 'InsertStocktakeResponseWithId',
          id: input.id,
          response: regularInsertResponse,
        };

        return batchInsertResponse;
      });
    }

    if (vars.updateStocktakes) {
      response.updateStocktakes = vars.updateStocktakes.map(input => {
        const regularUpdateResponse = MutationResolvers.updateStocktake(_, {
          input,
        });
        const batchUpdateResponse: UpdateStocktakeResponseWithId = {
          __typename: 'UpdateStocktakeResponseWithId',
          id: input.id,
          response: regularUpdateResponse,
        };

        return batchUpdateResponse;
      });
    }

    if (vars.deleteStocktakes) {
      response.deleteStocktakes = vars.deleteStocktakes.map(input => {
        const regularDeleteResponse = MutationResolvers.deleteStocktake(_, {
          input,
        });
        const batchDeleteResponse: DeleteStocktakeResponseWithId = {
          __typename: 'DeleteStocktakeResponseWithId',
          id: input.id,
          response: regularDeleteResponse,
        };

        return batchDeleteResponse;
      });
    }

    if (vars.insertStocktakeLines) {
      response.insertStocktakeLines = vars.insertStocktakeLines.map(input => {
        const regularInsertResponse =
          MutationService.stocktakeLine.insert(input);
        const batchInsertResponse: InsertStocktakeLineResponseWithId = {
          __typename: 'InsertStocktakeLineResponseWithId',
          id: input.id,
          response: regularInsertResponse,
        };

        return batchInsertResponse;
      });
    }

    if (vars.updateStocktakeLines) {
      response.updateStocktakeLines = vars.updateStocktakeLines.map(input => {
        const regularUpdateResponse =
          MutationService.stocktakeLine.update(input);
        const batchInsertResponse: UpdateStocktakeLineResponseWithId = {
          __typename: 'UpdateStocktakeLineResponseWithId',
          id: input.id,
          response: regularUpdateResponse,
        };

        return batchInsertResponse;
      });
    }

    if (vars.deleteStocktakeLines) {
      response.deleteStocktakeLines = vars.deleteStocktakeLines.map(input => {
        const regularDeleteResponse =
          MutationService.stocktakeLine.delete(input);

        const batchInsertResponse: DeleteStocktakeLineResponseWithId = {
          __typename: 'DeleteStocktakeLineResponseWithId',
          id: input.id,
          response: regularDeleteResponse,
        };

        return batchInsertResponse;
      });
    }

    return response;
  },
};

export const Stocktake = {
  QueryResolvers,
  MutationResolvers,
};
