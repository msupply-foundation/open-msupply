// Open-model storm: fires syncInfo (the changelog_deduped COUNT) at a FIXED ARRIVAL RATE, regardless
// of how long each request takes. This is deliberately different from dashboardPoller, which is
// closed-loop (a VU waits for its response before firing again) and therefore caps concurrency and
// applies backpressure — which is why the closed-loop mix degrades but never collapses.
//
// With no backpressure, when each count takes ~10s the in-flight requests stack up: k6 keeps starting
// new iterations (allocating VUs up to maxVUs) at the configured rate, so dozens-to-hundreds of
// concurrent counts queue on the server's DB connection pool (default ~10). That exhausts the pool and
// craters every other query's latency — the mechanism that collapsed the real test (~111 subscription
// clients all recomputing the count concurrently). Drive the rate up until throughput tips over.
import { syncInfo } from '../ops/polling.js';
import { makeCtx } from '../lib/ctx.js';

export function syncInfoStorm(data) {
  // One syncInfo per iteration; the arrival-rate executor controls pacing, so NO sleep here.
  syncInfo(makeCtx(data));
}
