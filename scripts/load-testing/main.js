// omSupply GraphQL load test — entrypoint.
//
// Run (against any URL you point it at):
//   k6 run -e BASE_URL=http://localhost:8000 -e USERS='[{"username":"a","password":"x"}]' main.js
//   k6 run -e BASE_URL=... -e USERS='[{"username":"a","password":"x"}]' -e VU_MULTIPLIER=2 -e SYNC_INTERVAL=60 main.js
//
// See README.md for the full env-knob list. Operation documents come from
// operations.generated.js (produced by `yarn generate` from the client .graphql files).

import { buildOptions, config, parseUsers } from './config.js';
import { authenticate } from './auth/auth.js';
import { resolveStoreId, discoverDataset } from './setup/discover.js';

// Scenario exec functions MUST be exported from the entry module — k6 resolves `exec` names here.
import { heavyReader } from './scenarios/heavyReader.js';
import { dashboardPoller } from './scenarios/dashboardPoller.js';
import { requisitionWorkflow } from './scenarios/requisitionWorkflow.js';
import { invoiceWorkflow } from './scenarios/invoiceWorkflow.js';
import { stocktakeWorkflow } from './scenarios/stocktakeWorkflow.js';
import { reportsReader } from './scenarios/reportsReader.js';
import { syncDriver } from './scenarios/syncDriver.js';
import { syncInfoStorm } from './scenarios/syncInfoStorm.js';
import { syncSubscriber } from './scenarios/syncSubscriber.js';

export { heavyReader, dashboardPoller, requisitionWorkflow, invoiceWorkflow, stocktakeWorkflow, reportsReader, syncDriver, syncInfoStorm, syncSubscriber };

export const options = buildOptions();

export function setup() {
  const users = parseUsers();
  if (users.length === 0) {
    throw new Error('No users configured. Set a "users" list in the config file or USERS=\'[{"username":..,"password":..}]\'.');
  }

  // Validate every credential up front (fail fast) and resolve each user's OWN store. `workingUsers`
  // are the ones that logged in AND have an accessible store ({ username, password, storeId }) — VUs
  // only ever authenticate as these. `tokens` (index-aligned with workingUsers) is the per-VU fallback.
  // During the run each VU logs in as a random working user and drives that user's store — see
  // lib/session.js / lib/ctx.js. STORE_ID, if set, pins every user to that one store instead.
  const tokens = [];
  const workingUsers = [];
  for (const u of users) {
    const token = authenticate(config.graphqlUrl, u.username, u.password); // logs the reason on failure
    if (!token) continue;
    const storeId = resolveStoreId({ graphqlUrl: config.graphqlUrl, token, storeId: null }, config.storeId);
    if (!storeId) {
      console.warn(`[setup] "${u.username}" logged in but has no accessible store — excluded.`);
      continue;
    }
    tokens.push(token);
    workingUsers.push({ username: u.username, password: u.password, storeId });
  }
  if (tokens.length === 0) throw new Error('No usable users (all logins failed or had no store access) — see [auth]/[setup] warnings above.');
  if (workingUsers.length < users.length) {
    console.warn(`[setup] ${users.length - workingUsers.length}/${users.length} users excluded (login failed or no accessible store).`);
  }

  // Discover read pools ONCE per unique store the working users belong to. A VU reads from the pool of
  // whichever user's store it's currently logged in as (lib/ctx.js), so ids always match the store.
  const storeIds = [];
  for (const u of workingUsers) if (storeIds.indexOf(u.storeId) === -1) storeIds.push(u.storeId);
  const poolsByStore = {};
  for (const sid of storeIds) {
    const i = workingUsers.findIndex(u => u.storeId === sid);
    poolsByStore[sid] = discoverDataset({ graphqlUrl: config.graphqlUrl, token: tokens[i], storeId: sid }, config.poolSize);
  }

  console.log(`[setup] url=${config.graphqlUrl} users=${workingUsers.length} stores=${storeIds.length} vuMultiplier=${config.vuMultiplier} (each user drives its own store)`);
  console.log(
    `[setup] login: each VU logs in as a random user; ` +
      (config.reloginEveryOps > 0
        ? `re-auth ~every ${config.reloginEveryOps} ops (±50%) → ~1 login / ${config.reloginEveryOps} queries`
        : 're-login disabled (one login per VU)')
  );
  console.log(
    `[setup] sync: enabled=${config.syncEnabled}` +
      (config.syncEnabled ? ` interval=${config.syncInterval}s (manualSync — changelog lock path)` : ' (changelog lock path NOT exercised)')
  );
  for (const sid of storeIds) {
    const p = poolsByStore[sid];
    const n = workingUsers.filter(u => u.storeId === sid).length;
    console.log(
      `[setup] pools store=${sid} users=${n} items=${p.itemIds.length} suppliers=${p.supplierNameIds.length} ` +
        `reqParties=${p.requisitionPartyIds.length} stockLines=${p.stockLines.length} ` +
        `invoices=${p.invoiceIds.length} requests=${p.requestIds.length} ` +
        `stocktakes=${p.stocktakeIds.length} reports=${p.reportIds.length}`
    );
    if (p.supplierNameIds.length === 0) console.warn(`[setup]   store=${sid}: no suppliers — invoice workflow will skip here.`);
    if (p.requisitionPartyIds.length === 0) console.warn(`[setup]   store=${sid}: no store other-parties — requisition workflow will skip here.`);
    if (p.itemIds.length === 0) console.warn(`[setup]   store=${sid}: no items — requisition/stocktake workflows will skip here.`);
  }
  console.log(`[setup] RUN START ${new Date().toISOString()} (use this to window pg_stat_statements / lock logs)`);

  return { tokens, users: workingUsers, storeIds, poolsByStore };
}

function num(metric, key) {
  const m = metric && metric.values;
  return m && typeof m[key] === 'number' ? m[key].toFixed(1) : 'n/a';
}

function renderText(data) {
  const m = data.metrics || {};
  const dur = m.gql_op_duration;
  const lines = [
    '',
    `omSupply load test summary`,
    `  RUN END ${new Date().toISOString()}`,
    `  http requests:     ${num(m.http_reqs, 'count')}`,
    `  iterations:        ${num(m.iterations, 'count')}`,
    `  gql error rate:    ${m.gql_errors ? (m.gql_errors.values.rate * 100).toFixed(2) + '%' : 'n/a'}`,
    `  gql_op_duration:   avg ${num(dur, 'avg')}ms  p95 ${num(dur, 'p(95)')}ms  p99 ${num(dur, 'p(99)')}ms  p99.9 ${num(dur, 'p(99.9)')}ms  max ${num(dur, 'max')}ms`,
  ];

  // A Trend submetric carries no `count` in the summary — only the stat keys (avg/p95/p99/...). A slice
  // with a declared threshold but no samples this run (e.g. manualSync when sync is off) is emitted as
  // all-zeros, which would read like "instant" rather than "not run" — so require a positive max.
  const hasSamples = mm => mm && typeof mm.values.max === 'number' && mm.values.max > 0;

  // Login latency on its own — authToken goes through a raw http.post (auth/auth.js), so it never
  // reaches gql_op_duration. A fat tail here is the startup login storm (spread it with RAMP_DURATION).
  const auth = m.auth_duration;
  if (hasSamples(auth)) {
    lines.push(
      `  login (authToken): avg ${num(auth, 'avg')}ms  ` +
        `p95 ${num(auth, 'p(95)')}ms  p99 ${num(auth, 'p(99)')}ms  p99.9 ${num(auth, 'p(99.9)')}ms  max ${num(auth, 'max')}ms`
    );
  }

  // Latency by category (these slices exist because config.js declares a threshold on each — see the
  // note there). p99.9/max expose the tail the global p99 hides.
  const catDur = ['browse', 'polling', 'workflow', 'sync']
    .map(c => [c, m[`gql_op_duration{category:${c}}`]])
    .filter(([, mm]) => hasSamples(mm));
  if (catDur.length) {
    lines.push('  latency by category (ms):');
    for (const [c, mm] of catDur) {
      lines.push(
        `    ${c.padEnd(10)} avg ${num(mm, 'avg')}  p95 ${num(mm, 'p(95)')}  p99 ${num(mm, 'p(99)')}  p99.9 ${num(mm, 'p(99.9)')}  max ${num(mm, 'max')}`
      );
    }
  }

  // Sync (manualSync) is fire-and-forget: it returns "Sync triggered" immediately, so this op count
  // reflects how many times the changelog-lock path was *triggered* — NOT whether the background push
  // succeeded. Check latestSyncStatus.error / omSupply + mSupply logs for actual sync outcomes.
  const syncErr = m['gql_errors{category:sync}'];
  if (config.syncEnabled) {
    const triggers = syncErr ? syncErr.values.passes + syncErr.values.fails : 0;
    lines.push(`  sync triggers:     ${triggers} (interval=${config.syncInterval}s; fire-and-forget — see server logs for push outcomes)`);
  } else {
    lines.push('  sync triggers:     0 (syncEnabled=false — changelog lock path NOT exercised)');
  }

  // Per-category error rates (these sub-metrics exist because config.js sets thresholds on them).
  const catKeys = Object.keys(m).filter(k => k.startsWith('gql_errors{'));
  if (catKeys.length) {
    lines.push('  errors by category:');
    for (const k of catKeys.sort()) {
      const cat = k.slice('gql_errors{'.length, -1);
      lines.push(`    ${cat.padEnd(18)} ${(m[k].values.rate * 100).toFixed(2)}%`);
    }
  }

  // Per-op latency, slowest p99 first (slices emitted by config.js for every op). Skips ops with no
  // samples this run (e.g. manualSync when sync is disabled). This is where you see which op owns a tail.
  const opDur = Object.keys(m)
    .filter(k => k.startsWith('gql_op_duration{op:') && hasSamples(m[k]))
    .map(k => ({ op: k.slice('gql_op_duration{op:'.length, -1), v: m[k].values }))
    .sort((a, b) => (b.v['p(99)'] || 0) - (a.v['p(99)'] || 0));
  if (opDur.length) {
    lines.push('  per-op latency (ms), slowest p99 first:');
    for (const { op, v } of opDur) {
      const f = (key) => (typeof v[key] === 'number' ? v[key].toFixed(1) : 'n/a');
      lines.push(`    ${op.padEnd(26)} p99 ${f('p(99)')}  p95 ${f('p(95)')}  avg ${f('avg')}  max ${f('max')}`);
    }
  }

  lines.push(
    '',
    '  Total gql failures: ' + (m.gql_error_count ? m.gql_error_count.values.count : 0),
    '  The reason for each failing op was logged during the run as',
    '  "[gql-error] <op> (<kind>): <reason>" (once per distinct reason).',
    '  Full per-op/threshold detail is also in the JSON summary.',
    ''
  );
  return lines.join('\n');
}

export function handleSummary(data) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = `${config.outputDir}/summary-${ts}.json`;
  return {
    [file]: JSON.stringify(data, null, 2),
    stdout: renderText(data),
  };
}
