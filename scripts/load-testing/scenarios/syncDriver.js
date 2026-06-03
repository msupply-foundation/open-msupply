// Single periodic actor calling manualSync — the changelog ACCESS EXCLUSIVE lock path.
// Tolerates failure (e.g. sync not configured): the error is recorded under category:sync and the
// loop simply continues.
import { sleep } from 'k6';
import { manualSync } from '../ops/sync.js';
import { makeCtx } from '../lib/ctx.js';
import { config } from '../config.js';

export function syncDriver(data) {
  const ctx = makeCtx(data);
  manualSync(ctx, config.syncFetchPatientId);
  sleep(config.syncInterval);
}
