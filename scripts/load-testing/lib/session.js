// Per-VU login session. Each VU logs in as a RANDOM user before doing operations, then re-authenticates
// as another random user after it has served roughly config.reloginEveryOps GraphQL ops. This keeps a
// realistic, low login rate: the manual load test ran ~1 login per 70 queries (~1.4% of traffic), rather
// than logging in once and reusing the token forever (0%) or per request (huge).
//
// NB: in k6 each VU runs an isolated JS runtime, so these module-level variables are per-VU state.
import { authenticate } from '../auth/auth.js';
import { config } from '../config.js';
import { randInt } from './rand.js';

let _token = null; // this VU's current session token
let _opsSinceLogin = 0; // ops served on the current token (incremented by graphql.js via recordOp)
let _threshold = 0; // ops to serve before re-authenticating (jittered per session)

// Jitter the re-login point ±50% around config.reloginEveryOps so VUs don't all re-auth in lockstep.
function nextThreshold() {
  const base = config.reloginEveryOps;
  return base > 0 ? randInt(Math.ceil(base / 2), Math.ceil(base * 1.5)) : Number.MAX_SAFE_INTEGER;
}

// Called by graphql.js after every recorded GraphQL op so the session knows when to re-login.
export function recordOp() {
  _opsSinceLogin += 1;
}

// Returns a valid token for this VU, logging in as a random user when there's no session yet or the
// current one has served its quota. `users` is the validated pool from setup() (only accounts that
// actually logged in); `fallbackToken` (a setup() token) is used only if a live login fails.
export function sessionToken(users, fallbackToken) {
  if (_token === null || _opsSinceLogin >= _threshold) {
    if (users && users.length) {
      const u = users[randInt(0, users.length - 1)];
      const t = authenticate(config.graphqlUrl, u.username, u.password);
      if (t) _token = t;
    }
    if (_token === null) _token = fallbackToken; // login failed and no session yet — borrow setup's token
    _opsSinceLogin = 0;
    _threshold = nextThreshold();
  }
  return _token;
}
