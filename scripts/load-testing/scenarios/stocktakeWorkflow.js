// Create a blank stocktake and batch-insert many lines (the large multi-line transaction).
import * as browse from '../ops/browse.js';
import * as st from '../ops/stocktake.js';
import { makeCtx } from '../lib/ctx.js';
import { sleepThink } from '../lib/thinktime.js';
import { uuidv4 } from '../lib/uuid.js';
import { take } from '../lib/pools.js';
import { randInt } from '../lib/rand.js';
import { config } from '../config.js';

const think = () => sleepThink(config.workflowThinkMinMs, config.workflowThinkMaxMs);

export function stocktakeWorkflow(data) {
  const ctx = makeCtx(data);
  if (ctx.pools.itemIds.length === 0) {
    think();
    return;
  }

  browse.stocktakes(ctx);
  think();

  const ins = st.insertStocktake(ctx, { id: uuidv4() });
  const node = ins && ins.insertStocktake;
  if (!node || node.__typename !== 'StocktakeNode') return;
  const stocktakeId = node.id;
  think();

  // 50-200 lines, capped by available distinct items.
  const count = Math.min(ctx.pools.itemIds.length, randInt(50, 200));
  const items = take(ctx.pools.itemIds, count, __VU, __ITER);
  // Snapshot-only lines (no countedNumberOfPacks): setting a count triggers an inventory adjustment,
  // which stores requiring adjustment reasons reject with "No adjustment reason provided". Omitting the
  // count still exercises the heavy batch insert (one changelog row per line) without needing reason
  // options to exist in the dataset.
  const lines = items.map(itemId => ({
    id: uuidv4(),
    stocktakeId,
    itemId,
    packSize: 1,
    note: config.tag,
  }));
  st.upsertStocktakeLines(ctx, lines);
  think();
}
