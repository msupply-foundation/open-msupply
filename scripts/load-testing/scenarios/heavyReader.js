// Browsing/searching user: items -> names -> stockLines, with short think-times.
import * as browse from '../ops/browse.js';
import { makeCtx } from '../lib/ctx.js';
import { sleepThink } from '../lib/thinktime.js';
import { config } from '../config.js';

export function heavyReader(data) {
  const ctx = makeCtx(data);
  browse.items(ctx);
  sleepThink(config.thinkMinMs, config.thinkMaxMs);
  browse.names(ctx);
  sleepThink(config.thinkMinMs, config.thinkMaxMs);
  browse.stockLines(ctx);
  sleepThink(config.thinkMinMs, config.thinkMaxMs);
}
