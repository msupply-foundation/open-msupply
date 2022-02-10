import {
  mockUpdateStocktakeMutation,
  mockStocktakeQuery,
  mockStocktakesQuery,
  mockDeleteStocktakesMutation,
  mockInsertStocktakeMutation,
  mockUpsertStocktakeLinesMutation,
  DeleteStocktakeInput,
  BatchStocktakeInput,
} from '@openmsupply-client/common/src/types';
import { ResolverService } from '../../../api/resolvers';
import { MutationService } from '../../../api/mutations';
import { Stocktake as StocktakeSchema } from '../../../schema/Stocktake';

const updateStocktake = mockUpdateStocktakeMutation((req, res, ctx) => {
  const result = MutationService.stocktake.update(req.variables.input);
  return res(ctx.data({ updateStocktake: result }));
});

const stocktakeQuery = mockStocktakeQuery((req, res, ctx) => {
  return res(
    ctx.data({
      stocktake: ResolverService.stocktake.byId(req.variables.stocktakeId),
    })
  );
});

const stocktakesQuery = mockStocktakesQuery((req, res, ctx) => {
  return res(
    ctx.data({
      stocktakes: ResolverService.stocktake.list(req?.variables.params),
    })
  );
});

const deleteStocktakesMutation = mockDeleteStocktakesMutation(
  (req, res, ctx) => {
    const { ids } = req.variables;

    let deleteStocktakes: DeleteStocktakeInput[] = [];
    if (Array.isArray(ids)) {
      deleteStocktakes = ids;
    } else {
      deleteStocktakes = ids ? [ids] : [];
    }

    const params: BatchStocktakeInput = {
      deleteStocktakes: deleteStocktakes ?? [],
    };
    return res(
      ctx.data({
        batchStocktake: {
          __typename: 'BatchStocktakeResponse',
          deleteStocktakes:
            StocktakeSchema.MutationResolvers.batchStocktake(
              null,
              params
            ).deleteStocktakes?.map?.(response => ({
              // The type for DeleteStocktakeResponseWithId has an optional
              // typename for some unknown reason, so re-add the typename to keep typescript happy.
              __typename: 'DeleteStocktakeResponseWithId',
              ...response,
            })) ?? [],
        },
      })
    );
  }
);

const insertStocktakeMutation = mockInsertStocktakeMutation((req, res, ctx) => {
  return res(
    ctx.data({
      insertStocktake: {
        ...MutationService.stocktake.insert(req.variables.input),
      },
    })
  );
});

const upsertStocktakeMutation = mockUpsertStocktakeLinesMutation(
  (req, res, ctx) => {
    // This whole thing is a little unfortunate.
    // The variables can technically be arrays or a single object as is just normal
    // for graphql (If the array is a single element in variables, you can just send the
    // single element) - generally your graphql server framework (i.e. apollo) will parse this
    // into an array for you - so i've manually parsed it here.
    // Then, the graphql code gen types generally have `__typename` as an optional field as it's
    // not always queried for - but in the types returned by queries, when you specify the type name,
    // it becomes mandatory to have this in the response, so we have to manually add it.
    const params = {
      ...req.variables,
      deleteStocktakeLines: [],
      insertStocktakeLines: Array.isArray(req.variables.insertStocktakeLines)
        ? req.variables.insertStocktakeLines
        : req.variables.insertStocktakeLines
        ? [req.variables.insertStocktakeLines]
        : req.variables.insertStocktakeLines,
      updateStocktakeLines: Array.isArray(req.variables.updateStocktakeLines)
        ? req.variables.updateStocktakeLines
        : req.variables.updateStocktakeLines
        ? [req.variables.updateStocktakeLines]
        : [],
      updateStocktakes: [],
    };

    const response = StocktakeSchema.MutationResolvers.batchStocktake(
      null,
      params
    );

    const updateStocktakes: {
      __typename: 'UpdateStocktakeResponseWithId';
      id: string;
    }[] =
      response?.updateStocktakes?.map(r => ({
        __typename: 'UpdateStocktakeResponseWithId',
        id: r.id,
      })) ?? [];

    const insertStocktakeLines: {
      __typename: 'InsertStocktakeLineResponseWithId';
      id: string;
    }[] =
      response?.insertStocktakeLines?.map(r => ({
        __typename: 'InsertStocktakeLineResponseWithId',
        id: r.id,
      })) ?? [];

    const deleteStocktakeLines: {
      __typename: 'DeleteStocktakeLineResponseWithId';
      id: string;
    }[] =
      response?.deleteStocktakeLines?.map(r => ({
        __typename: 'DeleteStocktakeLineResponseWithId',
        id: r.id,
      })) ?? [];

    const updateStocktakeLines: {
      __typename: 'UpdateStocktakeLineResponseWithId';
      id: string;
    }[] =
      response?.updateStocktakeLines?.map(r => ({
        __typename: 'UpdateStocktakeLineResponseWithId',
        id: r.id,
      })) ?? [];

    return res(
      ctx.data({
        batchStocktake: {
          __typename: 'BatchStocktakeResponse',
          updateStocktakes,
          insertStocktakeLines,
          deleteStocktakeLines,
          updateStocktakeLines,
        },
      })
    );
  }
);

export const StocktakeHandlers = [
  stocktakeQuery,
  stocktakesQuery,
  deleteStocktakesMutation,
  insertStocktakeMutation,
  upsertStocktakeMutation,
  updateStocktake,
];
