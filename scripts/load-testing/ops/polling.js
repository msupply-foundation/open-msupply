// Background polling operations — the constant chatter every open omSupply screen produces.
// ~36% of real traffic. Cheap individually, but collectively a big share of CPU load.
import { gqlRequest } from '../lib/graphql.js';
import { operations } from '../operations.generated.js';

const C = 'polling';

export const me = ctx => gqlRequest(ctx, operations.me, C, {});
export const lastSuccessfulUserSync = ctx => gqlRequest(ctx, operations.lastSuccessfulUserSync, C, {});
export const isCentralServer = ctx => gqlRequest(ctx, operations.isCentralServer, C, {});
export const initialisationStatus = ctx => gqlRequest(ctx, operations.initialisationStatus, C, {});
// syncInfo carries `numberOfRecordsInPushQueue` → a COUNT over changelog_deduped. The real client
// gets this via the syncInfoUpdated subscription (server recomputes + pushes per client); k6 can't
// drive graphql-ws, so we poll the equivalent query to reproduce that per-client changelog scan.
export const syncInfo = ctx => gqlRequest(ctx, operations.syncInfo, C, {});

export const preferences = ctx => gqlRequest(ctx, operations.preferences, C, { storeId: ctx.storeId });

export const itemCounts = ctx =>
  gqlRequest(ctx, operations.itemCounts, C, {
    storeId: ctx.storeId,
    lowStockThreshold: 3,
    highStockThreshold: 6,
  });

export const requisitionCounts = ctx => gqlRequest(ctx, operations.requisitionCounts, C, { storeId: ctx.storeId });
export const stockCounts = ctx => gqlRequest(ctx, operations.stockCounts, C, { storeId: ctx.storeId });
export const internalOrderCounts = ctx => gqlRequest(ctx, operations.internalOrderCounts, C, { storeId: ctx.storeId });
export const inboundCounts = ctx => gqlRequest(ctx, operations.inboundCounts, C, { storeId: ctx.storeId });
export const outboundCounts = ctx => gqlRequest(ctx, operations.outboundCounts, C, { storeId: ctx.storeId });
