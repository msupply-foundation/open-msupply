# omSupply GraphQL load test (k6)

A repeatable, target-agnostic load test that drives the omSupply GraphQL API with a realistic
concurrent-user workload, to track production performance under load over time. Derived from the
real workload profile in [`../../load-test-results/load_test_plan.md`](../../load-test-results/load_test_plan.md).

## Requirements

- [k6](https://k6.io/docs/get-started/installation/) (`brew install k6`).
- A running omSupply server you can reach, with a user account and some data. The script discovers
  store/item/supplier/stock ids at runtime, so it adapts to whatever DB is behind the URL (SQLite or
  Postgres, fresh-init or a production datafile). It does **not** seed data.

> The `changelog` lock contention (the primary failure mode in the manual test) only reproduces on
> **Postgres** with realistic data volume and the sync driver enabled — it's a no-op on SQLite.

## Quick start

Configuration lives in a **config file** (so every option is discoverable in one place). Copy the
tracked example to your own untracked file and edit it:

```bash
# 1. create your config (in scripts/load-testing)
cp loadtest.config.example.jsonc loadtest.config.jsonc   # then set baseUrl + credentials

# 2. run it (from the repo root) — creates output/ and runs k6
yarn load-test
# ...or directly:  cd scripts/load-testing && mkdir -p output && k6 run main.js
```

`loadtest.config.jsonc` is gitignored; `loadtest.config.example.jsonc` is the documented template
(keep them in sync when adding options). If the config file is missing, the run stops with a message
telling you to copy the example. Point at a different file with `-e CONFIG_FILE=path`.

Any option can still be overridden by an env var for CI / quick runs (env wins over the file). Args
after `yarn load-test` are passed through to k6:

```bash
yarn load-test -e VU_MULTIPLIER=2 -e SYNC_INTERVAL=60 -e HOLD_DURATION=1m
```

The main knobs to tune a run: `vuMultiplier` (load level), `syncInterval` (how aggressively the
changelog lock path is hit), `rampDuration`/`holdDuration` (run length), and `strictThresholds`
(whether per-op latency gates pass/fail the run, or are just informational).

## Options

Each config-file key has a matching env-var override (env wins).

| Config key | Env var | Default | Purpose |
|---|---|---|---|
| `baseUrl` | `BASE_URL` | `http://localhost:8000` | target server; GraphQL is `${baseUrl}/graphql` |
| `username` / `password` | `USERNAME` / `PASSWORD` | — | single-user login |
| `users` | `USERS` (JSON) | — | user pool (overrides username/password) |
| `storeId` | `STORE_ID` | discovered | override the store (else `me.defaultStore`) |
| `vuMultiplier` | `VU_MULTIPLIER` | `1` | scales the 8/6/5/4/4/2/1 worker mix |
| `rampDuration` | `RAMP_DURATION` | `5m` | ramp to steady state |
| `holdDuration` | `HOLD_DURATION` | `15m` | steady-state hold |
| `syncEnabled` | `SYNC_ENABLED` | `true` | include the manualSync driver |
| `syncInterval` | `SYNC_INTERVAL` | `60` | seconds between manualSync calls |
| `syncFetchPatientId` | `SYNC_FETCH_PATIENT_ID` | — | optional arg to manualSync |
| `thinkMinMs` / `thinkMaxMs` | `THINK_MIN_MS` / `THINK_MAX_MS` | `1000` / `5000` | read-action think-time jitter |
| `workflowThinkMinMs` / `workflowThinkMaxMs` | `WORKFLOW_THINK_MIN_MS` / `WORKFLOW_THINK_MAX_MS` | `5000` / `15000` | workflow-step think-time (keeps read/write mix ~95/5) |
| `poolSize` | `POOL_SIZE` | `200` | ids discovered per pool in setup |
| `outputDir` | `OUTPUT_DIR` | `./output` | where summaries are written |
| `strictThresholds` | `STRICT_THRESHOLDS` | `false` | apply strict per-op latency gates |

## Worker mix (≈33 VUs)

10 heavy-reader · 8 dashboard-poller · 4 requisition-workflow · 4 invoice-workflow ·
4 stocktake-workflow · 2 reports · 1 sync-driver. Each is a k6 `ramping-vus` scenario (a closed
model — fixed VUs looping with think-time, i.e. real concurrent users). Workflows skip gracefully
when the dataset lacks prerequisites (e.g. no suppliers).

The mix is read-heavy and workflows use a longer think-time (`workflowThink*`) so the emitted
op mix is ~95% read / 5% write, matching the manual load test. Reads dominate because most users
are browsing/polling at any moment while only a few are mid-workflow — and workflow users pause
between form steps. Tune `vuMultiplier` to scale load (the read/write ratio is preserved).

## Output & server-side pairing

`handleSummary` writes `output/summary-<timestamp>.json` (for diffing p99s across runs) and a
text summary to stdout. The k6 summary tells you *which operation* is slow or failing — pair it with
server-side capture for the *why*:

- **Postgres**: reset `pg_stat_statements` just before the run, snapshot after (which SQL), and enable
  `log_lock_waits` to see `changelog` contention. Use the `RUN START`/`RUN END` timestamps the script
  prints to window the stats. (See the Postgres setup checklist in `load_test_plan.md`.)
- **SQLite**: `pg_stat_statements` is N/A — rely on the server's own timing logs.

## Cleaning up created data

Workflow scenarios create real records (requisitions, inbound shipments, stocktakes + their lines).
Every created record is stamped with the `tag` value (default `k6-loadtest`) on its
`theirReference` / `comment` / line `note` field, so the data this script produces is identifiable.

This repo does **not** implement the deletion itself — but the marker makes it possible. A cleanup
would find records where the reference/comment/note equals the tag and delete the parents (lines
cascade). Use a distinct `tag` per run (e.g. `-e TAG=run-2026-06-02`) if you want to scope cleanup to
a single run. Prefer running against a snapshot/restorable DB where you can simply restore instead.

## Operations are generated, not hand-written

The query documents live in [`operations.generated.js`](operations.generated.js), produced by
[`build/extract-operations.mjs`](build/extract-operations.mjs) from the **same** `client/**/*.graphql`
files graphql-codegen consumes. This keeps the harness using the client's real operations and catches
query/field drift. It is wired into `yarn gql-codegen` / `yarn generate`; regenerate with:

```bash
node build/extract-operations.mjs        # or: cd ../../client && yarn generate
```

Do not edit `operations.generated.js` by hand. Note: *variable-shape* drift (renamed required input
fields) is not caught at build time — it shows up at runtime as a `Bad user input` error (flagged by
the error detector); fix the variable builders in [`ops/`](ops/).

## Layout

```
main.js                  entrypoint: options, setup, handleSummary, scenario exports
config.js                loads config file + env overrides, scenario + threshold builders
loadtest.config.example.jsonc  tracked template (copy to loadtest.config.jsonc, which is gitignored)
operations.generated.js  GENERATED { key: { name, query } } operation map
build/extract-operations.mjs  regenerates the above from client/**/*.graphql
lib/                     graphql helper, error classifier, metrics, uuid, think-time, pools, ctx
auth/                    authToken login
setup/                   runtime store + id-pool discovery
ops/                     one call per operation (variables + tags), grouped by domain
scenarios/               per-VU workflows (the 7 worker classes)
```

## Future enhancements

- Drive `generateReport` / a running-balance ledger query in the reports scenario to exercise the
  slow `stock_movement` query (root cause 2.2 in the plan).
- CI job (nightly / workflow_dispatch) that boots a Postgres-backed seeded server and runs a
  fixed config (`strictThresholds: true`) as a regression gate.
