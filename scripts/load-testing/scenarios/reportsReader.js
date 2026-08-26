// Reports user: list available reports periodically. (Generating reports / running-balance ledger
// queries are a future enhancement — see README.)
import * as browse from '../ops/browse.js';
import { makeCtx } from '../lib/ctx.js';
import { sleepThink } from '../lib/thinktime.js';

export function reportsReader(data) {
  const ctx = makeCtx(data);
  browse.reports(ctx);
  sleepThink(5000, 15000);
}
