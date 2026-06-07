// Create a request requisition, add & update several lines, then submit. All client ops.
import * as browse from '../ops/browse.js';
import * as req from '../ops/requisition.js';
import { makeCtx } from '../lib/ctx.js';
import { sleepThink } from '../lib/thinktime.js';
import { uuidv4 } from '../lib/uuid.js';
import { pick, take } from '../lib/pools.js';
import { randInt } from '../lib/rand.js';
import { config } from '../config.js';

const think = () => sleepThink(config.workflowThinkMinMs, config.workflowThinkMaxMs);

export function requisitionWorkflow(data) {
  const ctx = makeCtx(data);
  // Request requisitions order from another store (not just any supplier).
  const otherPartyId = pick(ctx.pools.requisitionPartyIds, __VU, __ITER);

  // Graceful skip when the dataset lacks prerequisites.
  if (!otherPartyId || ctx.pools.itemIds.length === 0) {
    think();
    return;
  }

  browse.requests(ctx);
  think();

  const ins = req.insertRequest(ctx, { id: uuidv4(), otherPartyId });
  const node = ins && ins.insertRequestRequisition;
  if (!node || node.__typename !== 'RequisitionNode') return;
  const requisitionId = node.id;
  think();

  // Distinct items (avoids RequisitionLineWithItemIdExists).
  const items = take(ctx.pools.itemIds, randInt(3, 10), __VU, __ITER);
  const lineIds = [];
  for (const itemId of items) {
    const r = req.insertRequestLine(ctx, { id: uuidv4(), itemId, requisitionId });
    const line = r && r.insertRequestRequisitionLine;
    if (line && line.__typename === 'RequisitionLineNode') lineIds.push(line.id);
  }
  think();

  for (let i = 0; i < lineIds.length; i++) {
    req.updateRequestLine(ctx, { id: lineIds[i], requestedQuantity: i + 1 });
  }
  think();

  req.submitRequest(ctx, { id: requisitionId });
  think();
}
