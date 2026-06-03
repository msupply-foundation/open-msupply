# Sync integration exhausting Postgres max_locks_per_transaction

- _Date_: 2026-06-03
- _Deciders_: @andreievg, Team Ruru 🦉
- _Status_: PROPOSED (leaning Option 4)
- _Outcome_: TBD — leaning towards Option 4 (transaction grouping + `is_synced` store gating + persisted virtual safe-cursor), with Option 1 (temporary `max_locks_per_transaction` bump) kept as a migration-time escape hatch and Option 2 (the existing `disable_integration_transaction` flag) retained as an emergency override.
- _Issue_: [#11826](https://github.com/msupply-foundation/open-msupply/issues/11826)
- _Background / measurements_: [syncdoc/content/max_locks_per_transaction/README.md](../syncdoc/content/max_locks_per_transaction/README.md)

## Context

Sync integration is **atomic by batch**: [`integrate_and_translate_sync_buffer`](../server/service/src/sync/synchroniser.rs) wraps the whole sync-buffer integration in a single Postgres transaction so that all records become visible together and logical integrity holds (an invoice and its lines, a stock line and its ledger, etc. are never seen half-applied).

Postgres takes a **relation-level lock for every relation a transaction writes to**, held until commit, in a fixed-size shared lock table sized roughly:

```
max_locks_per_transaction × (MaxBackends + max_prepared_transactions)
```

Crucially the cost is per **distinct relation** (table — and, for `UPDATE`, every index on that table), **not** per row. So batching rows does not help; the number of distinct relations touched in one transaction is what matters. A large integration — a v7 migration of stores, or a store being moved onto a site — writes across many tables (and their indexes) inside the one outer transaction and exhausts the shared lock table:

```text
ERROR: out of shared memory
HINT:  You might need to increase "max_locks_per_transaction".
```

Reported in [#11826](https://github.com/msupply-foundation/open-msupply/issues/11826): a remote site with 7 active stores, migrated v6 → v7, fails sync with this error.

**This is Postgres-only.** SQLite uses serializable isolation with a single writer and no shared lock table, so it never hits this. In practice that means central servers and any Postgres-backed remote sites (the issue is on a Postgres remote); SQLite remotes are unaffected and continue to use the wrapping transaction unchanged.

The [`max_locks_per_transaction` demo](../syncdoc/content/max_locks_per_transaction/README.md) maps the failure threshold as a matrix of `max_locks_per_transaction` vs. number of relations written, and shows the two levers that move it (`max_locks_per_transaction`, `max_connections`) plus why `UPDATE` (locks heap + every index) fails far sooner than `INSERT`.

### Current state — the band-aid

A stop-gap already exists: [`disable_integration_transaction`](../server/service/src/sync/settings.rs) on `SyncSettings` (default `false`, documented in [example.yaml](../server/configuration/example.yaml)), threaded as `use_transaction` into integration. When `true` the outer transaction is dropped entirely. It is documented "use with caution" and was flagged for further QA — it is all-or-nothing and, on a live site, unsafe (see consequences A/B/C below).

### Consequences of dropping the transaction

If integration is **not** wrapped in a transaction, three things can go wrong:

- **A — Partial reads.** A user could see discrepancies, e.g. stock without its `invoice_lines`, mid-integration.
- **B — Incomplete changelog.** A changelog entry for an invoice is written before its lines are integrated, so any cursor-based consumer (sync push, transfer/assign processors) may process an incomplete record. Today the changelog max-safe-cursor tracker that prevents this is **in-memory only** (manager-owned `Mutex<HashMap<Uuid, i64>>`, see [changelog/locking](../syncdoc/content/changelog/locking/README.md)); with no wrapping transaction there is nothing to scope the boundary to, and it would not survive a restart mid-integration.
- **C — Integrity checks.** Checks such as the ledger discrepancy check could read inconsistent intermediate state.

Mitigations exist for each: A and C are largely contained by only ever exposing a store once its integration has fully completed (consumers — ledger included — run only on active stores); B needs a safe-cursor boundary that does not depend on a single DB transaction.

## Options

### Option 1 — Raise `max_locks_per_transaction` (config / ops only)

Increase the setting (the issue used `256`). Optionally set it very high for the initial-migration window, then drop to a modest raised default afterward. Requires a server restart.

_Pros:_

- No code change beyond documentation; keeps full atomicity.
- Proven — the issue reporter unblocked sync this way.

_Cons:_

- Permanently reserves shared memory (`size × MaxBackends`) that idle servers never use; we explicitly do not want to reserve this.
- Requires a restart, and is easy to miss in deployment/setup (raised by @jmbrunskill — must be documented and shared with Support/QA).
- Doesn't scale: a large enough migration always finds a new ceiling.

### Option 2 — Disable the integration transaction (the existing flag)

Use `disable_integration_transaction: true` as-is.

_Pros:_

- Trivial; already implemented; removes the lock ceiling completely.

_Cons:_

- Loses atomicity → exposes A, B and C.
- Blunt: off for everything or nothing, for the whole site.
- Unsafe on a live site as it stands.

### Option 3 — Transaction grouping via integration spec

Extend the integration order mechanism. Translators already declare `PullDependencies` that feed the topological [`pull_integration_order`](../server/service/src/sync/translations/mod.rs); add a transaction-group annotation alongside it. Integrate central / reference data **without** a big transaction, and wrap only the table families that must be atomic (e.g. invoice + invoice_line + stock_line) in smaller per-group transactions — keeping the number of relations per transaction below the ceiling without giving up the integrity that matters.

_Pros:_

- Principled; bounds lock usage per transaction.
- Keeps atomicity where it actually counts.
- Reusable building block for Option 4; helps both the migration and runtime-move scenarios.

_Cons:_

- Can still exceed max_lock_per_transaction if there is enough remote data
- Requires classifying every table correctly — mis-grouping risks subtle integrity gaps.
- Doesn't by itself solve B for consumers that span groups.
- More complex integration path to maintain.

### Option 4 — Combined: grouping + `is_synced` store gating + persisted virtual safe-cursor (leaning)

Engaged when the sync buffer is above a size threshold (large migrations); normal small syncs keep the cheap single-transaction path. Builds on Option 3 and adds:

- **`is_synced` store gating (solves A, most of C).** A flag on `store` (e.g. `is_synced` / `store_migrated`), set `true` only after that store's integration has fully completed successfully. Every place that checks `is_active` also checks this, so a store's data is never exposed mid-integration. SQLite keeps using the wrapping transaction, so this path is effectively central/Postgres-only. This touches every `is_active` check. Introduces more use cases to deal with, i.e. when store is made non active on site, reset this. This field is not synced.
- **Persisted virtual safe-cursor (solves B).** Extend the in-memory max-safe-cursor tracker with a persisted boundary so that, when integration runs without a wrapping DB transaction, changelog consumers are held back to the pre-batch cursor until the batch completes — and the hold survives a server restart mid-integration. Goes hand in hand with `is_synced` gating. Ideally this is run as virtual transaction.

_Pros:_

- Solves A/B/C without reserving shared memory.
- Safe on live sites; degrades gracefully across restarts.
- Scales to arbitrarily large migrations.

_Cons:_

- Most work of any option.
- Persisting the cursor boundary is new behaviour.
- `is_synced` touches every `is_active` check.
- Needs the sync-buffer size threshold tuned.

## Decision

TBD. Leaning **Option 4**, built on **Option 3** (which is worth doing regardless of where this lands). **Option 1**'s temporary bump is retained as a migration-time escape hatch and **Option 2**'s flag as an emergency override.

## Consequences

_(To be confirmed with the decision.)_

- Option 3 — transaction grouping — proceeds independently as the foundation: add a transaction-group annotation to the integration spec and split the single outer transaction into per-group transactions.
- `is_synced` store gating to be specified in a **separate KDD**, since it touches every `is_active` check across the codebase.
- Persisted virtual safe-cursor extends the existing changelog cursor tracker ([changelog/locking](../syncdoc/content/changelog/locking/README.md)) with a persisted, restart-surviving boundary, gated on sync-buffer size.
- The non-transactional path is gated on a sync-buffer size threshold (to tune); SQLite always keeps the wrapping transaction.
- Keep `disable_integration_transaction` and a documented `max_locks_per_transaction` bump as escape hatches; ensure both are documented for Support/QA (per @jmbrunskill).
