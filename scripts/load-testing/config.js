// Central configuration. Options come from a config file (loadtest.config.json by default) so they're
// discoverable in one place; any value can still be overridden by an env var (handy for CI / quick runs).
// Read in init context, so __ENV and k6's open() are available.

function env(name, def) {
  return __ENV[name] !== undefined && __ENV[name] !== '' ? __ENV[name] : def;
}
function envInt(name, def) {
  const v = __ENV[name];
  return v !== undefined && v !== '' ? parseInt(v, 10) : def;
}
function envFloat(name, def) {
  const v = __ENV[name];
  return v !== undefined && v !== '' ? parseFloat(v) : def;
}
function envBool(name, def) {
  const v = __ENV[name];
  if (v === undefined || v === '') return def;
  return v === 'true' || v === '1' || v === 'yes';
}

// --- config file ----------------------------------------------------------
// The actual file is untracked (gitignored); loadtest.config.example.json is the tracked template.
function readConfigFile() {
  const path = env('CONFIG_FILE', './loadtest.config.jsonc');
  let raw;
  try {
    raw = open(path);
  } catch (_e) {
    throw new Error(
      `\nConfig file not found at "${path}".\n` +
        `Copy the example and edit it:\n` +
        `  (in scripts/load-testing)  cp loadtest.config.example.jsonc loadtest.config.jsonc\n` +
        `Or point elsewhere with -e CONFIG_FILE=<path>.\n`
    );
  }
  try {
    return JSON.parse(stripJsonc(raw));
  } catch (e) {
    throw new Error(`Failed to parse ${path}: ${e.message}\n(JSON forbids trailing commas)`);
  }
}

// Strip // line comments and /* */ block comments, ignoring those inside strings (so "http://..." survives).
function stripJsonc(s) {
  let out = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const n = s[i + 1];
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
      continue;
    }
    if (c === '/' && n === '/') {
      while (i < s.length && s[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++;
      i += 1; // land on '/', loop's i++ moves past it
      continue;
    }
    out += c;
  }
  return out;
}

const file = readConfigFile();
const pick = (envName, fileKey, def) => {
  // env wins, then file, then default
  const e = env(envName, undefined);
  if (e !== undefined) return e;
  return file[fileKey] !== undefined && file[fileKey] !== null ? file[fileKey] : def;
};

const baseUrl = String(pick('BASE_URL', 'baseUrl', 'http://localhost:8000')).replace(/\/+$/, '');

export const config = {
  baseUrl,
  graphqlUrl: `${baseUrl}/graphql`,
  storeId: pick('STORE_ID', 'storeId', null),
  // Scales the 8/6/5/4/4/2/1 worker mix. Tune per run (env: VU_MULTIPLIER).
  vuMultiplier: envFloat('VU_MULTIPLIER', file.vuMultiplier != null ? file.vuMultiplier : 1),
  rampDuration: pick('RAMP_DURATION', 'rampDuration', '5m'),
  holdDuration: pick('HOLD_DURATION', 'holdDuration', '15m'),
  syncEnabled: envBool('SYNC_ENABLED', file.syncEnabled != null ? file.syncEnabled : true),
  // Seconds between manualSync triggers — the changelog lock path (env: SYNC_INTERVAL).
  syncInterval: envInt('SYNC_INTERVAL', file.syncInterval != null ? file.syncInterval : 60),
  syncFetchPatientId: pick('SYNC_FETCH_PATIENT_ID', 'syncFetchPatientId', null),
  // Open-model syncInfo storm — fires the changelog_deduped COUNT at a fixed arrival rate (no
  // backpressure) to reproduce the subscription fan-out that collapsed the real test. Off by default.
  // syncStormRate is the target syncInfo requests/second; ramps 0 -> rate over rampDuration then holds.
  syncStormEnabled: envBool('SYNC_STORM_ENABLED', file.syncStormEnabled != null ? file.syncStormEnabled : false),
  syncStormRate: envInt('SYNC_STORM_RATE', file.syncStormRate != null ? file.syncStormRate : 40),
  // Cap on concurrent VUs the storm may allocate. With ~10s counts, in-flight ≈ rate × 10s, so this
  // must be high to let the pileup form (else k6 just drops iterations — itself a collapse signal).
  syncStormMaxVus: envInt('SYNC_STORM_MAX_VUS', file.syncStormMaxVus != null ? file.syncStormMaxVus : 300),
  // Persistent graphql-ws subscribers (the path real clients prefer). Each VU holds one websocket
  // subscribed to syncInfoUpdated — exercises the shared/debounced subscription worker, the broadcast
  // fan-out and the subscription trigger channel. count = number of concurrent connected clients.
  syncSubscriberEnabled: envBool('SYNC_SUBSCRIBER_ENABLED', file.syncSubscriberEnabled != null ? file.syncSubscriberEnabled : false),
  syncSubscriberCount: envInt('SYNC_SUBSCRIBER_COUNT', file.syncSubscriberCount != null ? file.syncSubscriberCount : 50),
  // How long each VU holds its subscription before reconnecting (reproduces real reconnect churn).
  syncSubscriberHoldSeconds: envInt('SYNC_SUBSCRIBER_HOLD_SECONDS', file.syncSubscriberHoldSeconds != null ? file.syncSubscriberHoldSeconds : 300),
  thinkMinMs: envInt('THINK_MIN_MS', file.thinkMinMs != null ? file.thinkMinMs : 1000),
  thinkMaxMs: envInt('THINK_MAX_MS', file.thinkMaxMs != null ? file.thinkMaxMs : 5000),
  // Workflow scenarios pause longer between steps (a human filling/editing a form), which keeps the
  // write rate realistic — this is the main reason the real load test was ~95% read / 5% write.
  workflowThinkMinMs: envInt('WORKFLOW_THINK_MIN_MS', file.workflowThinkMinMs != null ? file.workflowThinkMinMs : 5000),
  workflowThinkMaxMs: envInt('WORKFLOW_THINK_MAX_MS', file.workflowThinkMaxMs != null ? file.workflowThinkMaxMs : 15000),
  poolSize: envInt('POOL_SIZE', file.poolSize != null ? file.poolSize : 200),
  // Ops a VU serves on one login before re-authenticating as another random user. The manual load
  // test ran ~1 login per 70 queries (~1.4% of traffic); the per-session point is jittered ±50%
  // around this. 0 disables re-login (one random login per VU for its whole life). (env: RELOGIN_EVERY_OPS)
  reloginEveryOps: envInt('RELOGIN_EVERY_OPS', file.reloginEveryOps != null ? file.reloginEveryOps : 70),
  outputDir: pick('OUTPUT_DIR', 'outputDir', './output'),
  // Apply strict per-op latency thresholds that gate pass/fail (env: STRICT_THRESHOLDS).
  strictThresholds: envBool('STRICT_THRESHOLDS', file.strictThresholds != null ? file.strictThresholds : false),
  // Marker stamped onto the reference/comment/note of every record the script creates, so they can
  // be found and cleaned up later (e.g. delete requisitions/shipments/stocktakes WHERE their_reference = tag).
  tag: String(pick('TAG', 'tag', 'k6-loadtest')),
  // login material (resolved in parseUsers)
  _fileUsers: Array.isArray(file.users) ? file.users : null,
};

// Resolve the user pool: env USERS (JSON array) > file.users. Always a list of {username,password}.
export function parseUsers() {
  const usersJson = env('USERS', null);
  if (usersJson) {
    let parsed;
    try {
      parsed = JSON.parse(usersJson);
    } catch (_e) {
      throw new Error('USERS must be a JSON array of {username,password} objects');
    }
    if (!Array.isArray(parsed)) throw new Error('USERS must be a JSON array');
    return parsed;
  }
  if (config._fileUsers && config._fileUsers.length) return config._fileUsers;
  return [];
}

// --- worker mix -----------------------------------------------------------
// Read-heavy to match the real workload (~95% read / 5% write). Workflows still run, but with
// long human-like think-times (see workflowThink* above) so they don't dominate the op mix.
const BASE_MIX = {
  heavyReader: 10,
  dashboardPoller: 8,
  requisitionWorkflow: 4,
  invoiceWorkflow: 4,
  stocktakeWorkflow: 4,
  reportsReader: 2,
};
const vus = n => Math.max(1, Math.round(n * config.vuMultiplier));

function rampingScenario(exec, target, startTime) {
  return {
    executor: 'ramping-vus',
    exec,
    startTime,
    startVUs: 0,
    gracefulRampDown: '30s',
    gracefulStop: '30s',
    stages: [
      { duration: config.rampDuration, target },
      { duration: config.holdDuration, target },
    ],
    tags: { scenario: exec },
  };
}

function buildScenarios() {
  // All scenarios start together (startTime 0s) so every worker class loads concurrently — that's
  // the point. setup() has already discovered the data pools before any VU runs, so there's nothing
  // to warm up first.
  const scenarios = {};
  scenarios.heavyReader = rampingScenario('heavyReader', vus(BASE_MIX.heavyReader), '0s');
  scenarios.dashboardPoller = rampingScenario('dashboardPoller', vus(BASE_MIX.dashboardPoller), '0s');
  scenarios.requisitionWorkflow = rampingScenario('requisitionWorkflow', vus(BASE_MIX.requisitionWorkflow), '0s');
  scenarios.invoiceWorkflow = rampingScenario('invoiceWorkflow', vus(BASE_MIX.invoiceWorkflow), '0s');
  scenarios.stocktakeWorkflow = rampingScenario('stocktakeWorkflow', vus(BASE_MIX.stocktakeWorkflow), '0s');
  scenarios.reportsReader = rampingScenario('reportsReader', vus(BASE_MIX.reportsReader), '0s');
  if (config.syncEnabled) {
    // A single periodic actor; it loops with sleep(syncInterval) internally.
    scenarios.syncDriver = rampingScenario('syncDriver', 1, '0s');
  }
  if (config.syncStormEnabled) {
    // Open model: fixed arrival rate, NO backpressure. k6 keeps starting iterations at `target`
    // req/s and allocates VUs (up to maxVUs) when prior ones are still blocked on a ~10s count, so
    // concurrent counts pile up and exhaust the DB pool. Ramps 0 -> rate over rampDuration then holds,
    // matching how every other worker class ramps up. Raise syncStormRate to find the tipping point.
    scenarios.syncInfoStorm = {
      executor: 'ramping-arrival-rate',
      exec: 'syncInfoStorm',
      startTime: '0s',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: Math.min(50, config.syncStormMaxVus),
      maxVUs: config.syncStormMaxVus,
      stages: [
        { duration: config.rampDuration, target: config.syncStormRate },
        { duration: config.holdDuration, target: config.syncStormRate },
      ],
      gracefulStop: '30s',
      tags: { scenario: 'syncInfoStorm' },
    };
  }
  if (config.syncSubscriberEnabled) {
    // Persistent connected clients, ramped like every other worker class (0→count over rampDuration,
    // then hold). Each VU holds a graphql-ws subscription for syncSubscriberHoldSeconds, then reconnects.
    scenarios.syncSubscriber = rampingScenario('syncSubscriber', vus(config.syncSubscriberCount), '0s');
  }
  return scenarios;
}

function buildThresholds() {
  const t = {
    // Global gates. Loose enough to pass on a healthy system.
    // sync errors are excluded from gating so a central-less datafile doesn't dominate the rate.
    'gql_errors{category:polling}': ['rate<0.02'],
    'gql_errors{category:browse}': ['rate<0.02'],
    'gql_errors{category:workflow}': ['rate<0.05'],
    // Non-gating: `rate<=1` is always true for a Rate metric. We only define this so k6 emits the
    // {category:sync} submetric into the summary — k6 omits tagged submetrics that have no threshold,
    // which previously made the sync op count/latency invisible (folded into the base metric).
    'gql_errors{category:sync}': ['rate<=1'],
    'gql_op_duration{category:sync}': ['p(99)>=0'],
  };
  if (config.strictThresholds) {
    t['gql_op_duration{category:polling}'] = ['p(95)<500'];
    t['gql_op_duration{category:browse}'] = ['p(99)<2000'];
    t['gql_op_duration{category:workflow}'] = ['p(99)<3000'];
    t['gql_op_duration{op:items}'] = ['p(99)<1500'];
    t['gql_op_duration{op:invoices}'] = ['p(99)<2000'];
    t['gql_op_duration{op:insertRequest}'] = ['p(99)<1000'];
  }
  return t;
}

export function buildOptions() {
  return {
    scenarios: buildScenarios(),
    thresholds: buildThresholds(), // NB: no abortOnFail anywhere — runs always complete.
    // Load-test servers often use a self-signed/internal cert; needed for wss subscriptions too.
    insecureSkipTLSVerify: true,
    noConnectionReuse: false, // keep-alive on, matching the real client
    discardResponseBodies: false, // we parse bodies for error detection
    // Tail latency is the point of this test — k6's default stats stop at p95.
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)', 'max'],
  };
}
