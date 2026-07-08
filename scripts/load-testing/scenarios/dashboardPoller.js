// Open-screen polling: fires the background queries a logged-in client emits, then idles.
import * as polling from '../ops/polling.js';
import { makeCtx } from '../lib/ctx.js';
import { sleepThink } from '../lib/thinktime.js';

export function dashboardPoller(data) {
  const ctx = makeCtx(data);
  polling.me(ctx);
  polling.syncInfo(ctx);
  polling.initialisationStatus(ctx);
  polling.isCentralServer(ctx);
  polling.preferences(ctx);
  polling.itemCounts(ctx);
  polling.requisitionCounts(ctx);
  polling.stockCounts(ctx);
  polling.internalOrderCounts(ctx);
  polling.inboundInternalCounts(ctx);
  polling.inboundExternalCounts(ctx);
  polling.outboundCounts(ctx);
  // App-boot / per-navigation bundle the real client also emits. supplierProgramSettings and
  // frontendPluginMetadata are as frequent as `me`/the counts in the real capture, so fire them every
  // cycle. The rest are rarer (~1% each) — fire them on roughly every third cycle so the emitted rate
  // matches rather than overshoots.
  polling.supplierProgramSettings(ctx);
  polling.frontendPluginMetadata(ctx);
  if (__ITER % 3 === 0) {
    polling.displaySettings(ctx);
    polling.activeVvmStatuses(ctx);
    polling.permissions(ctx);
    polling.nameProperties(ctx);
  }
  // Poll cycle: idle 5-10s before the next refresh.
  sleepThink(5000, 10000);
}
