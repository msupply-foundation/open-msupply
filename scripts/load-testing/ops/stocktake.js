// Stocktake workflow ops. The batch line upsert (batchStocktake) is the large multi-line transaction
// that was the highest-count mutation in the real workload.
import { gqlRequest } from '../lib/graphql.js';
import { operations } from '../operations.generated.js';
import { config } from '../config.js';

const C = 'workflow';

// data.insertStocktake -> { __typename, id, stocktakeNumber }. comment/description tagged for cleanup.
export const insertStocktake = (ctx, { id }) =>
  gqlRequest(ctx, operations.insertStocktake, C, {
    storeId: ctx.storeId,
    input: { id, description: config.tag, comment: config.tag, createBlankStocktake: true },
  });

// `insertStocktakeLines` are InsertStocktakeLineInput objects ({ id, stocktakeId, itemId, countedNumberOfPacks, ... }).
export const upsertStocktakeLines = (ctx, insertStocktakeLines) =>
  gqlRequest(ctx, operations.upsertStocktakeLines, C, { storeId: ctx.storeId, insertStocktakeLines });

export const finaliseStocktake = (ctx, { id }) =>
  gqlRequest(ctx, operations.updateStocktake, C, { storeId: ctx.storeId, input: { id, status: 'FINALISED' } });
