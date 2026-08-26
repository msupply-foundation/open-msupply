// Request-requisition workflow ops. Uses the client's per-line insert/update (not a synthetic batch),
// which matches the real workload and exercises one `changelog` insert per line.
import { gqlRequest } from '../lib/graphql.js';
import { operations } from '../operations.generated.js';
import { config } from '../config.js';

const C = 'workflow';

// data.insertRequestRequisition -> { __typename, id }. theirReference is tagged for later cleanup.
export const insertRequest = (ctx, { id, otherPartyId }) =>
  gqlRequest(ctx, operations.insertRequest, C, {
    storeId: ctx.storeId,
    input: { id, otherPartyId, maxMonthsOfStock: 3, minMonthsOfStock: 1, theirReference: config.tag, comment: config.tag },
  });

// data.insertRequestRequisitionLine -> { __typename, id }
export const insertRequestLine = (ctx, { id, itemId, requisitionId }) =>
  gqlRequest(ctx, operations.insertRequestLine, C, {
    storeId: ctx.storeId,
    input: { id, itemId, requisitionId },
  });

// data.updateRequestRequisitionLine -> { __typename, id }
export const updateRequestLine = (ctx, { id, requestedQuantity }) =>
  gqlRequest(ctx, operations.updateRequestLine, C, {
    storeId: ctx.storeId,
    input: { id, requestedQuantity, comment: config.tag },
  });

// data.updateRequestRequisition -> { __typename, id }
export const submitRequest = (ctx, { id }) =>
  gqlRequest(ctx, operations.updateRequest, C, {
    storeId: ctx.storeId,
    input: { id, status: 'SENT' },
  });
