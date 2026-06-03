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

  if (res.status !== 200) return null;
  let body;
  try {
    body = JSON.parse(res.body);
  } catch (_e) {
    return null;
  }
  const authToken = body && body.data && body.data.authToken;
  if (authToken && authToken.__typename === 'AuthToken' && authToken.token) {
    return authToken.token;
  }
  return null;
}
