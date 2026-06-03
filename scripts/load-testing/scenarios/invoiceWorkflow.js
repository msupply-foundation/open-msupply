// Create an inbound shipment from a supplier, add a few lines, then advance its status.
import * as browse from '../ops/browse.js';
import * as inv from '../ops/invoice.js';
import { makeCtx } from '../lib/ctx.js';
import { sleepThink } from '../lib/thinktime.js';
import { uuidv4 } from '../lib/uuid.js';
import { pick, take } from '../lib/pools.js';
import { randInt } from '../lib/rand.js';
import { config } from '../config.js';

const think = () => sleepThink(config.workflowThinkMinMs, config.workflowThinkMaxMs);

export function invoiceWorkflow(data) {
  const ctx = makeCtx(data);
  const supplierId = pick(data.supplierNameIds, __VU, __ITER);
  if (!supplierId) {
    think();
    return;
  }

  browse.invoices(ctx);
  think();

  const ins = inv.insertInboundShipment(ctx, { id: uuidv4(), otherPartyId: supplierId });
  const node = ins && ins.insertInboundShipment;
  if (!node || node.__typename !== 'InvoiceNode') return;
  const invoiceId = node.id;
  think();

  // Add lines if we discovered stock items to reference.
  const stock = take(data.stockLines, randInt(3, 5), __VU, __ITER);
  if (stock.length) {
    const lines = stock.map(sl => ({
      id: uuidv4(),
      invoiceId,
      itemId: sl.itemId,
      packSize: 1,
      numberOfPacks: randInt(1, 20),
      costPricePerPack: 1,
      sellPricePerPack: 2,
      note: config.tag,
    }));
    inv.upsertInboundShipmentLines(ctx, lines);
    think();
  }

  inv.updateInboundShipment(ctx, { id: invoiceId, status: 'DELIVERED' });
  think();
}
