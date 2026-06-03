import { config } from '../config.js';
import { sessionToken } from './session.js';

// Build the per-request context for a VU. The token comes from the VU's login session (session.js):
// it logs in as a random user up front and re-authenticates periodically, mirroring a real client.
// A setup() token (pinned per VU) is passed as the fallback used only if a live login fails.
// `data` is the setup() return value.
export function makeCtx(data) {
  const fallback = data.tokens[(__VU - 1) % data.tokens.length];
  const token = sessionToken(data.users, fallback);
  return { graphqlUrl: config.graphqlUrl, storeId: data.storeId, token };
}
