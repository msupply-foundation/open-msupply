// Runtime dataset discovery. Runs once in setup() so the harness adapts to whatever DB is behind
// the target URL (SQLite/Postgres, fresh-init or production datafile) instead of hardcoding ids.
// Uses raw posts (not the metric-recording gqlRequest) so discovery doesn't pollute op metrics.
import http from 'k6/http';
import { operations } from '../operations.generated.js';

function rawQuery(ctx, op, variables) {
  const res = http.post(
    ctx.graphqlUrl,
    JSON.stringify({ operationName: op.name, query: op.query, variables: variables || {} }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.token}` } }
  );
  if (res.status !== 200) return null;
  try {
    const body = JSON.parse(res.body);
    if (body.errors && body.errors.length) return null;
    return body.data;
  } catch (_e) {
    return null;
  }
}

const nodesOf = conn => (conn && Array.isArray(conn.nodes) ? conn.nodes : []);

// Resolve the store id: explicit override, else the user's default store, else first accessible store.
export function resolveStoreId(ctx, override) {
  if (override) return override;
  const data = rawQuery(ctx, operations.me, {});
  const me = data && data.me;
  if (!me) return null;
  if (me.defaultStore && me.defaultStore.id) return me.defaultStore.id;
  const stores = nodesOf(me.stores);
  return stores.length ? stores[0].id : null;
}

// Build read-only id pools. Each query is best-effort: a missing/empty result → empty pool, logged once.
export function discoverDataset(ctx, poolSize) {
  const pools = {
    itemIds: [],
    supplierNameIds: [], // isSupplier — valid otherParty for inbound shipments
    requisitionPartyIds: [], // isStore — valid otherParty for request requisitions (internal orders)
    stockLines: [], // [{ id, itemId }]
    invoiceIds: [],
    requestIds: [],
    stocktakeIds: [],
    reportIds: [],
  };

  const items = rawQuery(ctx, operations.items, {
    storeId: ctx.storeId, first: poolSize, offset: 0, key: 'name', desc: false,
  });
  pools.itemIds = nodesOf(items && items.items).map(n => n.id);

  // Inbound shipments require a supplier. Request requisitions require the other party to be BOTH a
  // supplier AND a linked store (server validates check_other_party(Supplier) then other_party.store_id()
  // — see server/.../request_requisition/insert.rs), i.e. a supplying store. So we keep two pools.
  const suppliers = rawQuery(ctx, operations.names, {
    storeId: ctx.storeId, first: poolSize, offset: 0, key: 'name', desc: false,
    filter: { isSupplier: true },
  });
  pools.supplierNameIds = nodesOf(suppliers && suppliers.names).map(n => n.id);

  const supplyingStores = rawQuery(ctx, operations.names, {
    storeId: ctx.storeId, first: poolSize, offset: 0, key: 'name', desc: false,
    filter: { isSupplier: true, isStore: true },
  });
  pools.requisitionPartyIds = nodesOf(supplyingStores && supplyingStores.names).map(n => n.id);

  const stock = rawQuery(ctx, operations.stockLines, {
    storeId: ctx.storeId, first: poolSize, offset: 0, key: 'expiryDate', desc: false,
    filter: { isAvailable: true },
  });
  pools.stockLines = nodesOf(stock && stock.stockLines).map(n => ({ id: n.id, itemId: n.itemId }));

  const invoices = rawQuery(ctx, operations.invoices, {
    storeId: ctx.storeId, first: poolSize, offset: 0, key: 'createdDatetime', desc: true,
    type: ['INBOUND_SHIPMENT'],
  });
  pools.invoiceIds = nodesOf(invoices && invoices.invoices).map(n => n.id);

  const requests = rawQuery(ctx, operations.requests, {
    storeId: ctx.storeId, page: { first: poolSize, offset: 0 },
  });
  pools.requestIds = nodesOf(requests && requests.requisitions).map(n => n.id);

  const stocktakes = rawQuery(ctx, operations.stocktakes, {
    storeId: ctx.storeId, page: { first: poolSize, offset: 0 },
  });
  pools.stocktakeIds = nodesOf(stocktakes && stocktakes.stocktakes).map(n => n.id);

  const reports = rawQuery(ctx, operations.reports, {
    storeId: ctx.storeId, userLanguage: 'en', key: 'name', desc: false,
  });
  pools.reportIds = nodesOf(reports && reports.reports).map(n => n.id);

  return pools;
}
