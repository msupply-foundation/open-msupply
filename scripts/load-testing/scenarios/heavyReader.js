// Browsing/searching user: scans a list, then drills into a record's detail page — the dominant real
// pattern (detail views were ~9% of the real capture and entirely absent before; bare list re-fetches
// were ~10x over-represented). Each iteration browses the item/name/stock lists, then opens one
// list+record pair (invoice/request/stocktake), rotated across iterations so all detail resolvers run.
import * as browse from '../ops/browse.js';
import { makeCtx } from '../lib/ctx.js';
import { sleepThink } from '../lib/thinktime.js';
import { pick } from '../lib/pools.js';
import { config } from '../config.js';

const think = () => sleepThink(config.thinkMinMs, config.thinkMaxMs);

// Open a list, pause as a user scans it, then open one record's detail. Falls back to the next domain
// when a pool is empty so the scenario still does useful work on a sparse dataset.
function drillIntoDetail(ctx, data) {
  // Rotate the domain per iteration (offset by VU so different VUs hit different details concurrently).
  const order = [0, 1, 2];
  const start = (__VU + __ITER) % 3;
  for (let i = 0; i < order.length; i++) {
    const kind = order[(start + i) % 3];
    if (kind === 0 && data.invoiceIds.length) {
      browse.invoices(ctx);
      think();
      browse.invoice(ctx, pick(data.invoiceIds, __VU, __ITER));
      return;
    }
    if (kind === 1 && data.requestIds.length) {
      browse.requests(ctx);
      think();
      browse.requestById(ctx, pick(data.requestIds, __VU, __ITER));
      return;
    }
    if (kind === 2 && data.stocktakeIds.length) {
      browse.stocktakes(ctx);
      think();
      browse.stocktake(ctx, pick(data.stocktakeIds, __VU, __ITER));
      return;
    }
  }
}

export function heavyReader(data) {
  const ctx = makeCtx(data);
  browse.items(ctx);
  think();
  browse.names(ctx);
  think();
  browse.stockLines(ctx);
  think();
  drillIntoDetail(ctx, data);
  think();
}
