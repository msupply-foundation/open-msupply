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

export { heavyReader, dashboardPoller, requisitionWorkflow, invoiceWorkflow, stocktakeWorkflow, reportsReader, syncDriver, syncInfoStorm };

export const options = buildOptions();

export function setup() {
  const users = parseUsers();
  if (users.length === 0) {
    throw new Error('No users configured. Set a "users" list in the config file or USERS=\'[{"username":..,"password":..}]\'.');
  }

  // Validate every credential up front (fail fast). `workingUsers` are the ones that actually logged in
  // (e.g. NoSiteAccess users are dropped) — VUs only ever re-authenticate as these. `tokens` is the
  // per-VU fallback. During the run each VU logs in as a random working user itself and re-authenticates
  // periodically — see lib/session.js.
  const tokens = [];
  const workingUsers = [];
  for (const u of users) {
    const token = authenticate(config.graphqlUrl, u.username, u.password); // logs the reason on failure
    if (token) {
      tokens.push(token);
      workingUsers.push(u);
    }
  }
  if (tokens.length === 0) throw new Error('All logins failed — cannot run (see [auth] warnings above).');
  if (tokens.length < users.length) {
    console.warn(`[setup] ${users.length - tokens.length}/${users.length} logins failed — those users are excluded from the run.`);
  }

  const ctx0 = { graphqlUrl: config.graphqlUrl, token: tokens[0], storeId: null };
  const storeId = resolveStoreId(ctx0, config.storeId);
  if (!storeId) throw new Error('Could not resolve a store id (me.defaultStore/stores empty). Set STORE_ID.');
  ctx0.storeId = storeId;

  const pools = discoverDataset(ctx0, config.poolSize);

  console.log(`[setup] url=${config.graphqlUrl} store=${storeId} tokens=${tokens.length} vuMultiplier=${config.vuMultiplier}`);
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
  console.log(
    `[setup] pools: items=${pools.itemIds.length} suppliers=${pools.supplierNameIds.length} ` +
      `reqParties=${pools.requisitionPartyIds.length} stockLines=${pools.stockLines.length} ` +
      `invoices=${pools.invoiceIds.length} requests=${pools.requestIds.length} ` +
      `stocktakes=${pools.stocktakeIds.length} reports=${pools.reportIds.length}`
  );
  if (pools.supplierNameIds.length === 0) console.warn('[setup] no suppliers — invoice workflow will skip.');
  if (pools.requisitionPartyIds.length === 0) console.warn('[setup] no store other-parties — requisition workflow will skip.');
  if (pools.itemIds.length === 0) console.warn('[setup] no items — requisition/stocktake workflows will skip.');
  console.log(`[setup] RUN START ${new Date().toISOString()} (use this to window pg_stat_statements / lock logs)`);

  return { tokens, users: workingUsers, storeId, ...pools };
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
    `  gql_op_duration:   avg ${num(dur, 'avg')}ms  p95 ${num(dur, 'p(95)')}ms  p99 ${num(dur, 'p(99)')}ms  max ${num(dur, 'max')}ms`,
  ];

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

  lines.push(
    '',
    '  Total gql failures: ' + (m.gql_error_count ? m.gql_error_count.values.count : 0),
    '  The reason for each failing op was logged during the run as',
    '  "[gql-error] <op> (<kind>): <reason>" (once per distinct reason).',
    '  Per-operation p99 and threshold pass/fail are in the JSON summary.',
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
