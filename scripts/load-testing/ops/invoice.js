// Inbound-shipment (invoice) workflow ops.
import { gqlRequest } from '../lib/graphql.js';
import { operations } from '../operations.generated.js';
import { config } from '../config.js';

const C = 'workflow';

// insertInboundShipment takes flat args (not an input wrapper). data.insertInboundShipment -> { id, invoiceNumber }
export const insertInboundShipment = (ctx, { id, otherPartyId }) =>
  gqlRequest(ctx, operations.insertInboundShipment, C, { id, otherPartyId, storeId: ctx.storeId });

// Add lines via the batch op. `lines` are InsertInboundShipmentLineInput objects.
export const upsertInboundShipmentLines = (ctx, lines) =>
  gqlRequest(ctx, operations.upsertInboundShipment, C, {
    storeId: ctx.storeId,
    input: { insertInboundShipmentLines: lines },
  });

// insertInboundShipment has no reference field, so the shipment is tagged here on update (for cleanup).
export const updateInboundShipment = (ctx, { id, status }) =>
  gqlRequest(ctx, operations.updateInboundShipment, C, {
    storeId: ctx.storeId,
    input: { id, status, theirReference: config.tag, comment: config.tag },
  });
