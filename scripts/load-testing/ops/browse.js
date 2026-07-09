// List/detail browse operations — searching and drilling into records.
import { gqlRequest } from '../lib/graphql.js';
import { operations } from '../operations.generated.js';

const C = 'browse';

export const items = (ctx, first = 50) =>
  gqlRequest(ctx, operations.items, C, { storeId: ctx.storeId, first, offset: 0, key: 'name', desc: false });

export const names = (ctx, first = 50) =>
  gqlRequest(ctx, operations.names, C, { storeId: ctx.storeId, first, offset: 0, key: 'name', desc: false });

export const stockLines = (ctx, first = 50) =>
  gqlRequest(ctx, operations.stockLines, C, { storeId: ctx.storeId, first, offset: 0, key: 'expiryDate', desc: false });

export const invoices = (ctx, first = 50) =>
  gqlRequest(ctx, operations.invoices, C, {
    storeId: ctx.storeId, first, offset: 0, key: 'createdDatetime', desc: true, type: ['INBOUND_SHIPMENT'],
  });

export const invoice = (ctx, id) =>
  gqlRequest(ctx, operations.invoice, C, { storeId: ctx.storeId, id, type: 'INBOUND_SHIPMENT' });

export const requests = ctx =>
  gqlRequest(ctx, operations.requests, C, { storeId: ctx.storeId, page: { first: 50, offset: 0 } });

export const requestById = (ctx, requisitionId) =>
  gqlRequest(ctx, operations.requestById, C, { storeId: ctx.storeId, requisitionId });

export const stocktakes = ctx =>
  gqlRequest(ctx, operations.stocktakes, C, { storeId: ctx.storeId, page: { first: 50, offset: 0 } });

export const stocktake = (ctx, stocktakeId) =>
  gqlRequest(ctx, operations.stocktake, C, { storeId: ctx.storeId, stocktakeId });

export const reports = ctx =>
  gqlRequest(ctx, operations.reports, C, { storeId: ctx.storeId, userLanguage: 'en', key: 'name', desc: false });
