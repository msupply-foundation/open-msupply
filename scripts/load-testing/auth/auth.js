// Real JWT login via the client's authToken operation. Run once per user in setup().
import http from 'k6/http';
import { operations } from '../operations.generated.js';

// Returns the JWT token string, or null on any failure (bad credentials, no site access, etc.).
export function authenticate(graphqlUrl, username, password) {
  const op = operations.authToken;
  const payload = JSON.stringify({
    operationName: op.name,
    query: op.query,
    variables: { username, password }, // NB: omSupply expects the password in plain text
  });

  const res = http.post(graphqlUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { op: 'authToken', category: 'auth', name: 'authToken' },
  });

  if (res.status !== 200) {
    // Non-200 is transport/gateway level (not a GraphQL AuthTokenError). 502/504 typically means the
    // omSupply server errored or timed out handling the login — note first-time logins for users whose
    // password isn't cached locally are verified against mSupply Central, so a slow/unreachable central
    // can surface here. Log the body (trimmed) so the gateway/server message is visible.
    const body = (res.body || '').toString().replace(/\s+/g, ' ').trim().slice(0, 200);
    console.warn(`[auth] "${username}" → http ${res.status} (${res.timings.duration.toFixed(0)}ms)${body ? ' — ' + body : ''}`);
    return null;
  }
  let body;
  try {
    body = JSON.parse(res.body);
  } catch (_e) {
    console.warn(`[auth] "${username}" → unparseable response`);
    return null;
  }
  if (body.errors && body.errors.length) {
    console.warn(`[auth] "${username}" → graphql error: ${body.errors[0].message}`);
    return null;
  }
  const authToken = body && body.data && body.data.authToken;
  if (authToken && authToken.__typename === 'AuthToken' && authToken.token) {
    return authToken.token;
  }
  // AuthTokenError — surface which variant (e.g. NoSiteAccess = user has no access to a store/site,
  // InvalidCredentials, AccountBlocked, CentralSyncRequired) so failures are diagnosable.
  const err = authToken && authToken.error;
  const kind = (err && err.__typename) || 'unknown';
  const desc = (err && err.description) || '';
  console.warn(`[auth] "${username}" → ${kind}${desc ? ': ' + desc : ''}`);
  return null;
}
