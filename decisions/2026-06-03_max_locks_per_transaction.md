# Sync integration exhausting Postgres max_locks_per_transaction

- _Date_: 2026-06-03
- _Deciders_: @andreievg, Team Ruru 🦉
- _Status_: PROPOSED (leaning Option 1)
- _Outcome_: TBD — leaning towards Option 1 alone for now (see addendum: `max_locks_per_transaction = 256` sized against measured demand), with Option 2 (the existing `disable_integration_transaction` flag) retained as an emergency override.
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

Reported in [#11826](https://github.com/msupply-foundation/open-msupply/issues/11826): a remote site with 7 active stores, migrated v6 → v7, fails sync with this error. Note the reported site is a remote (single integration at a time); see the addendum's open-verification list — the failure mechanism on that site is not yet confirmed.

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
- ~~Doesn't scale: a large enough migration always finds a new ceiling.~~ Demand is schema-shaped (~700–900 slots per integration on today's schema — see addendum), so a fixed value sized per the addendum holds for arbitrarily large migrations; the number needs revisiting only if the schema grows substantially, the changelog accrues many more partitions, or central's connection pool is raised.

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

## Addendum (2026-07-08) — measured lock demand and sizing for Option 1

### Summary for reviewers

Measurement (live reproduction + audits of two CIV production copies) changes how Option 1
should be framed:

1. **Demand is schema-shaped, not volume-shaped.** One integration transaction holds one
   lock-table slot per *distinct relation* it touches, held to commit — row counts are
   irrelevant (measured: 389k–398k records integrated with the peak set entirely by schema +
   changelog partition count). On today's schema **`L ≈ 700–900` slots**: audit of the two CIV
   production copies gives L(v7) = 871 (33 changelog leaves) and 806 (25 leaves); the
   reproduced failure died at a footprint of 829.
2. **The #11826 error was reproduced during the integration phase** on a fresh v7 remote
   initialising against a CIV central copy — by raising the changelog to 86 leaves and probing
   the server's real ceiling (~876 slots) first. Schema init passed (~560), partition creation
   passed (~775), integration failed mid-`sync_buffer` write-back at 829 distinct relations.
   Details below.
3. **The supply formula is a floor, not a wall — and the space above it is non-deterministic.**
   Postgres only uses `max_locks_per_transaction × backends` to size shared memory; nothing
   enforces it per transaction. Locks past the nominal count silently consume spare shared
   memory until the whole segment is exhausted, and that spare varies attempt to attempt —
   the same workload can fail, retry, and succeed (observed). Two consequences: sizing must fit
   demand inside the *guaranteed* region, and a site at the boundary presents as a
   **retry loop / "slow sync"**, not a clean hard failure.
4. **A "central burst" — many remote sites pushing at once, each triggering its own
   integration on central — runs up to `connection_pool_max_connections` (default 10)
   integrations concurrently.** Each integration wraps in its own transaction, but all
   transactions draw on the **one cluster-wide lock pool** and hold their locks until their
   own commit, so concurrent integrations stack: worst case ≈ 10 × 900 = **9,000 slots
   against the stock 6,400** (64 × 100). Postgres defaults are insufficient on central even
   though a single integration fits several times over.
5. **Recommendation: `max_locks_per_transaction = 256`, `max_connections` at the Postgres
   default (100), and keep central's `connection_pool_max_connections` at 10.** Supply =
   256 × 100 = 25,600 nominal slots ≈ **2.8× the worst central burst** and ~29× a remote's
   single integration. 256 is also the value that resolved #11826 in the field. The pool cap
   is part of the sizing basis: raising `connection_pool_max_connections` above ~25 requires
   re-running this arithmetic (or moving to the pool-independent alternative below).

### Recommended values

| `max_locks_per_transaction` | Nominal slots @ 100 conns | Covers | Verdict |
|---|---|---|---|
| 64 (Postgres default) | 6,400 | 1 integration + light workload; **not** a central burst (~9,000) | insufficient |
| **256 (recommended)** | 25,600 | 10-concurrent central burst with ~2.8× margin; any remote with ~29× | **set once; re-check only if the central pool grows past ~25 or the schema grows substantially** |
| 1024 (alternative) | 102,400 | `max_locks ≥ L`, so supply covers demand at **any** concurrency — pool size and fleet size drop out entirely | for when the pool cap can't be relied on; costs a few tens of MB more reserved memory |

Why the 1024 row works at any concurrency: a backend runs one transaction at a time, so demand
≤ `max_connections × L` while supply = `max_locks × max_connections` — if `max_locks ≥ L`, the
connection terms cancel. 256 instead leans on the measured pool-bounded concurrency (10), which
is why the pool setting is named in the recommendation.

Do **not** raise `max_connections` for lock headroom — it grows the same supply but adds
per-backend overhead everywhere; integration throughput is `connection_pool_max_connections`
territory.

Operational follow-ups so the setting isn't missed (per @jmbrunskill's concern):

- document the value in the deployment/setup guides for central **and** Postgres remotes;
- have OMS log a prominent startup warning (or refuse to start sync) when
  `SHOW max_locks_per_transaction` < 256 on Postgres — a small code change that converts a
  mid-migration failure into a setup-time message;
- keep `disable_integration_transaction` as the emergency override, unchanged.

### Open verification on #11826 before moving to DECIDED

The reported failure was a **remote** site — concurrency 1 — so the central-burst arithmetic
cannot be its mechanism.

1. `SHOW max_locks_per_transaction;` and `SHOW max_connections;` — what were the pg settings used
2. `SELECT count(*) FROM pg_inherits WHERE inhparent = 'changelog'::regclass;` — each leaf
   costs ~9 slots and parent-scoped reads lock all of them; Was changelog even partitioned in that build?

Need a lot more information on all the different variables that could have affected that run.

None of this blocks Option 1

---

### Deep dive — demand: how many locks one integration transaction holds

Postgres takes one shared-lock-table slot per **distinct relation** written (table heap, each
index, TOAST pair, each partition leaf, partitioned parent), held to commit — never per row.
The per-record savepoints used by integration don't consume slots (a sub-XID lock is released
as each savepoint completes). Counting every relation integration can write:

| Component | Relations locked | Slots |
|---|---|---|
| Sync tables (v7 `INTEGRATION_ORDER` + `item_link`/`name_link`/`clinician_link`) | 106 heaps + 244 indexes + TOAST pairs | ~560 |
| `changelog` | parent + **every partition leaf** (~9 slots each: heap + indexes + TOAST pair). Measured: parent-scoped changelog reads (`max(cursor)`, batch queries) lock the whole family in one statement, not just the leaves the batch writes — e.g. 33 leaves | ~298 |
| `sync_buffer` | parent + pending + archive + indexes (constant — the per-record status flip moves rows across the two LIST partitions) | ~10 |
| Sequence + transaction identity | | ~4 |
| **Total `L`** | | **≈ 870** |

The v6 path lands within a few slots of the same number (same tables via translators, plus
`warning`). Only the changelog term grows over a deployment's life — ~9 slots per leaf, one new
leaf per 5 million cursors. (Full derivation with file references and a `pg_catalog` audit
query is available separately.)

### Deep dive — the measured reproduction

Setup: fresh v7 remote initialising against a CIV central copy; changelog forced to 86 leaves
(partition_size lowered so a fresh init creates them); server's real ceiling probed first at
**876 slots** (one transaction taking `ACCESS EXCLUSIVE` locks until failure, at
`max_locks=22, max_connections=8` — nominal 264, i.e. ~3.3× nominal before the error).

- Base-schema migration passed: ~560 distinct relations, all AccessExclusive DDL in one
  `batch_execute` transaction (this is the variant that fails first on small pools).
- Partition-creation migration passed: ~775.
- Integration climbed to **829 distinct relations and failed with the exact #11826 error**
  mid-`sync_buffer` write-back — right at the probed ceiling. The same integration at 65
  leaves peaked at 682 and survived: the changelog-family term alone moved it across the line.
- On a partitioned deployment, **integration — not schema init — is the high-water mark.**
- After the OOM the wrapping transaction rolled back, the sync runner retried, and a later
  attempt fit under the ceiling — the site eventually integrated all 398,500 records. At the
  boundary this failure mode is easy to misdiagnose as chronic slow sync.

**Measurement note:** `pg_locks` emits one row per lock *mode*, so a transaction that reads
then writes the same relation shows two rows for one slot pair — raw row counts over-report
slot consumption by ~5–10% for this workload. Use `count(DISTINCT relation)` per pid for a
transaction's true footprint (all figures above are reported that way), and exclude
`fastpath = true` rows, which consume no shared-table capacity.

### Deep dive — why the ceiling is soft and non-deterministic

`max_locks_per_transaction × (MaxBackends + max_prepared_transactions)` is used once, at
startup, as a byte-count input to shared-memory sizing (MaxBackends = `max_connections` +
worker/wal/autovacuum processes + 1 — using `max_connections` alone, as elsewhere in this KDD,
is the conservative floor). It is never checked as a cap on lock acquisition. The lock table is
a dynahash: when its pre-allocated entries run out it silently grabs more memory from the
segment's *spare* space — the ~100 KB safety slack, alignment padding, and other subsystems'
unused conservative reservations (e.g. the PROCLOCK table is sized for two holders per lock;
a single big transaction uses one). `out of shared memory` fires only when the whole segment
has no spare left; the HINT names `max_locks_per_transaction` because the lock manager is the
usual culprit, not because a budget was enforced.

Consequently the usable space above nominal is first-come-first-served across the whole
cluster and varies attempt to attempt — and there is no per-transaction accounting at all: one
transaction can drain the pool for every backend. Sizing must ignore the slop and fit demand
inside the guaranteed region.

### Deep dive — concurrency on central (what a "central burst" is)

A central burst is many remote sites syncing at the same time: each site's push triggers its
own integration on central, and central does **not** serialise integration across sites —
`spawn_integration` takes a per-site lock only
([sync_v7/sync_on_central](../server/service/src/sync_v7/sync_on_central/mod.rs),
same pattern in v6), so sites finishing their pushes together integrate concurrently. Each
integration runs in its own wrapping transaction, but that provides atomicity, not a private
lock budget — `max_locks_per_transaction` is only a sizing multiplier for the single
cluster-wide pool, and every open transaction holds its full lock footprint there until its
own commit. N concurrent integrations therefore cost ~N × L. The
effective ceiling is the server's DB connection pool — `connection_pool_max_connections`,
default 10 ([database_settings.rs](../server/repository/src/database_settings.rs)) —
shared with the API and processors. A fleet of any size therefore produces at most ~10
concurrent integrations; the rest queue on the pool while their sites poll
`wait_for_integration`. This cap is what the 256 recommendation is sized against.

## Decision

TBD. Leaning **Option 4**, built on **Option 3** (which is worth doing regardless of where this lands). **Option 1**'s temporary bump is retained as a migration-time escape hatch and **Option 2**'s flag as an emergency override.

## Consequences

_(To be confirmed with the decision.)_

- Option 3 — transaction grouping — proceeds independently as the foundation: add a transaction-group annotation to the integration spec and split the single outer transaction into per-group transactions.
- `is_synced` store gating to be specified in a **separate KDD**, since it touches every `is_active` check across the codebase.
- Persisted virtual safe-cursor extends the existing changelog cursor tracker ([changelog/locking](../syncdoc/content/changelog/locking/README.md)) with a persisted, restart-surviving boundary, gated on sync-buffer size.
- The non-transactional path is gated on a sync-buffer size threshold (to tune); SQLite always keeps the wrapping transaction.
- Keep `disable_integration_transaction` and a documented `max_locks_per_transaction` bump as escape hatches; ensure both are documented for Support/QA (per @jmbrunskill).
