import { config } from '../config.js';
import { sessionLogin } from './session.js';

// Build the per-request context for a VU. The token comes from the VU's login session (session.js):
// it logs in as a random user up front and re-authenticates periodically, mirroring a real client.
// Each user drives ITS OWN store (resolved in setup), so storeId and the read-pools follow whichever
// user the session is currently logged in as — a random user no longer gets dropped onto a store it
// has no access to. A setup() session (pinned per VU) is the fallback used only if a live login fails.
// `data` is the setup() return value: { tokens, users:[{username,password,storeId}], poolsByStore }.
export function makeCtx(data) {
  const idx = (__VU - 1) % data.users.length;
  const fallback = { token: data.tokens[idx], user: data.users[idx] };
  const { token, user } = sessionLogin(data.users, fallback);
  const storeId = user.storeId;
  return { graphqlUrl: config.graphqlUrl, storeId, token, pools: data.poolsByStore[storeId] };
}
