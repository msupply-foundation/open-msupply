// Open-screen polling: fires the background queries a logged-in client emits, then idles.
import * as polling from '../ops/polling.js';
import { makeCtx } from '../lib/ctx.js';
import { sleepThink } from '../lib/thinktime.js';

export function dashboardPoller(data) {
  const ctx = makeCtx(data);
  polling.me(ctx);
  polling.lastSuccessfulUserSync(ctx);
  polling.syncStatus(ctx);
  polling.initialisationStatus(ctx);
  polling.isCentralServer(ctx);
  polling.preferences(ctx);
  polling.itemCounts(ctx);
  polling.requisitionCounts(ctx);
  polling.stockCounts(ctx);
  polling.internalOrderCounts(ctx);
  polling.inboundCounts(ctx);
  polling.outboundCounts(ctx);
  // Poll cycle: idle 5-10s before the next refresh.
  sleepThink(5000, 10000);
}
