import { config } from '../config.js';

// Build the per-request context for a VU. Token is tied to __VU so each VU behaves like one stable
// session (mirrors a real client and avoids token thrash). `data` is the setup() return value.
export function makeCtx(data) {
  const token = data.tokens[(__VU - 1) % data.tokens.length];
  return { graphqlUrl: config.graphqlUrl, storeId: data.storeId, token };
}
