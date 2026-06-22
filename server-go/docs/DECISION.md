# Go port spike — interim findings (WS7, living document)

Status: **early but strongly positive on the core risks.** This records what has been
*proven with running code* vs. what is still estimated. Numbers below are from this machine
(Apple Silicon, arm64; Go 1.26.4; Rust 1.94; modernc.org/sqlite v1.52.0; gqlgen v0.17.90).

## Headline result so far

The two things most likely to kill the port — (a) reproducing the GraphQL API exactly, and
(b) the database/migration backward-compatibility — both look **achievable**, and the
compile-time payoff (the whole motivation) is **large and real**.

## Compile-time (WS6) — measured

| Scenario | Rust (current, as-is) | Go (this spike) |
|---|---|---|
| Incremental rebuild after changing one mid-level file | **~33s** (cargo self-report) / ~77s wall | **0.46s** |
| Full cold build | ~15–20 min *(observed for the `remote_server_cli` binary alone; not finely instrumented)* | **~10.2s** (entire module incl. the 180K-line generated GraphQL layer **and** all deps incl. transpiled modernc.org/sqlite) |

- Rust test: touched `server/service/src/lib.rs`, rebuilt `remote_server_cli` with the
  project's `RUSTFLAGS='--cfg recursion_limit_256'`, then reverted.
- Go test: touched `internal/graphql/model` (forces the 180,840-line `generated.go` +
  resolvers to recompile), `go build ./...`.
- **The Go cold build of the entire project is faster than a single Rust incremental rebuild.**
  Incremental dev loop is ~70–170× faster. This is the result the spike set out to find.
- Caveat that still matters: any Rust kept via **CGO** (Boa, etc.) reintroduces C-toolchain
  build cost and breaks Go's trivial cross-compilation. The pure-Go path above uses **no CGO**.

### Is this comparison fair? (important — read this)

**Not yet, on absolute terms.** The Go side today is only ~2,700 lines of *hand-written*
code plus ~197K lines of *machine-generated* gqlgen scaffolding + stubs. The Rust 337K LOC is
all real implementation (repository, services, sync engine, resolvers). So the Go build is
compiling far less *semantic* work, and the absolute cold-build number **will** grow as real
code is added.

**But the trend so far is strongly favourable, and two advantages are structural (size-independent):**

| Stage | Hand-written Go | Cold build | Incremental |
|---|---|---|---|
| Generated schema only | ~0 | 10.17s | 0.46s |
| + real repository slice + views + squirrel dep (WS2) | 2,735 | 10.72s | 0.09s |

- Adding the first real implementation barely moved cold build (+0.5s); incremental of a new
  package was 0.09s. The 197K generated lines alone compile in ~10s → Go sustains very high
  compile throughput on type-heavy code.
- Structural advantage 1: gqlgen runs its codegen **ahead of time** (`go generate`), so the
  GraphQL cost is paid once — Rust's `async-graphql` proc-macros + `recursion_limit_256`
  re-expand on every compile and are a prime suspect for the slow Rust builds.
- Structural advantage 2: Go incremental is **package-scoped + cached**; Rust recompiles a
  changed crate and its dependents (the 33s/77s above).
- **Honest projection:** even assuming hand-written Go compiles 2–3× slower per line than the
  flat generated code, a full ~300K-LOC port projects to ~30–45s cold and sub-second-to-few-second
  incrementals — still ~20–40× faster cold and ~10–100× faster per-edit than Rust today. The
  number to keep re-measuring as the port grows is **incremental rebuild**, since that is the
  actual dev-loop pain. This will be tracked workstream-by-workstream rather than asserted.

## Build resource cost — disk & test iteration (matters a lot for AI-driven dev)

Beyond wall-clock compile time, the Rust toolchain's **disk footprint** and **test-iteration
cost** are real friction — and they compound badly under agentic/AI development, which does
many iterative + cross-compile + experimental builds.

**Disk footprint (measured this spike):**
- Rust `server/target` reached **2.6 GB** after a *partial* build (the `repository` crate +
  deps, one profile). The trivial `boa_ffi` leaf crate (just `boa_engine`+`serde_json`) alone
  produced a **407 MB** target dir + a **39 MB** staticlib. A full release build measured
  **5.7 GB** (one feature); building both `sqlite` and `postgres` features produced two separate
  target dirs (**~11 GB**), and debug/test profiles + per-target cross-compile dirs grow it further.
- During this spike the Rust/CGO builds **repeatedly exhausted the disk** ("no space left on
  device"); the pure-Go work never did.
- Go: build cache **121 MB** (regenerable, shared across all projects), module cache 2.3 GB
  (shared, just downloaded sources), binaries **15–48 MB**.
- **AI-agent angle:** an agent iterating/cross-compiling multiplies Rust's per-target-dir
  footprint, and the slow compiles compound — together a material tax on high-iteration
  workflows (and CI cache sizes). Go's small, shared, fast-regenerating cache is far friendlier.

**Test iteration — the SAME 5 version-parsing tests, ported verbatim** (`version.rs` ↔
`version_test.go`):

| | Rust (`cargo nextest`) | Go (`go test`) |
|---|---|---|
| cold (compile test binary + run) | **82.7 s** | — |
| incremental (touch file, re-run) | **11.8 s** | **0.72 s** |
| actual test *execution* | 0.013 s | <0.01 s |
| full spike suite (warm) | (Rust suite far larger; not run) | 0.28 s |

The test logic is identical — the entire difference is compile/link. Rust spent **82 s to run
13 ms of tests**; even incrementally it's ~16× the Go inner loop. This is the day-to-day
feedback-loop tax (and it's worst exactly when iterating fast, e.g. with an AI agent).

## GraphQL API parity (WS1) — resolver wired end-to-end, serialization parity proven

- Exported the **exact SDL** from the Rust server: `remote_server_cli export-graphql-schema`
  → `schema/schema.graphql` (9,893 lines, 1,318 type defs, 5 custom scalars, only standard
  directives).
- `gqlgen` (schema-first) **generated and compiled** against that real schema with zero hand
  edits: root `Queries`/`Mutations` mapped correctly, union responses → Go interfaces, models
  carry correct camelCase JSON tags (e.g. `InvoiceNode.otherPartyId`) matching the wire format.
- **`invoices` query wired end-to-end** (resolver → WS2 repository → `InvoiceConnector` union
  member), served by a runnable Go server (`cmd/server`, `internal/graphql/server.go`). An
  in-process test (`internal/graphql/parity_test.go`) runs the real client operation and
  validates the full JSON envelope:
  `{"data":{"invoices":{"totalCount":2,"nodes":[{...}]}}}` — union member resolved via inline
  fragment, camelCase fields, enums as `OUTBOUND_SHIPMENT`, `comment: null`, linked-table name
  resolution, and field order following the query.
- **Concrete parity gap found and fixed — the kind of detail the spike exists to surface:**
  Rust builds `created_datetime` as `DateTime::<Utc>::from_naive_utc_and_offset(...)`, which
  async-graphql serializes via chrono `to_rfc3339()` → `2024-01-01T00:00:00+00:00` (numeric
  `+00:00`, **not** `Z`). Go's default RFC3339 emits `Z`. Fixed the Go `DateTime` scalar to
  match byte-for-byte. Methodology that worked: read the Rust scalar impl → mirror it in Go.
  (Remaining nuance: chrono AutoSi fractional-second grouping, not needed for today's
  whole-second data; tracked.)
- **Live byte-diff harness is wired but gated** (`TestInvoicesParity_LiveRustDiff`, skipped
  unless `RUST_GRAPHQL_URL`/`RUST_GRAPHQL_TOKEN` set). Completing the *live* diff needs the
  heavier Rust-server bring-up: build `remote_server` (~15–20 min), seed identical data, and
  mint an auth token (create user + login). The substantive risk — serialization/envelope
  parity — is already retired by code-reading + the envelope test; the live diff is
  confirmation.

## DataLoader / N+1 batching (WS1) — proven

`InvoiceNode.otherParty` is configured as a gqlgen resolver field (`gqlgen.yml`) and backed by
a request-scoped DataLoader (`internal/graphql/loaders`, using `vikstrous/dataloadgen` — the
analogue of async-graphql's DataLoader registry). A real GraphQL query selecting `otherParty`
across 3 invoices (`internal/graphql/dataloader_test.go`) collapses the per-invoice name
lookups into **one** batched `name WHERE id IN (…)` query (3 lookups → 2 distinct keys → 1
round-trip), with correct resolution including the merged-link case. Request-scoped loaders
are attached via middleware in `NewHandler`. The N+1 risk for the GraphQL layer is retired as
a pattern; the work at full scale is defining one loader per relationship.

## Repository layer (WS2) — hardest patterns proven

`internal/repository/invoice.go` reimplements a representative slice of
`server/repository/src/db_diesel/invoice.rs` with `database/sql` + squirrel, and proves the
three patterns that were the open questions:

- **`define_linked_tables!` core/view + record merge.** Reads go through `invoice_view`
  (created by the runner's view-rebuild step, SQL lifted verbatim from `link_views.rs`), which
  resolves `invoice.name_link_id → name_link.name_id → name`. A test seeds **two `name_link`
  rows pointing at one name** (a merge) and confirms invoices on *different* link ids both
  resolve to the same `name_id`/name — the whole reason the core/view split exists.
- **Dynamic filter/sort/pagination** — the `apply_equal_filter!` / `apply_string_filter!` /
  `apply_sort!` macros become small generic Go helpers over squirrel; equal/equal_any/string
  filters, no-case sort, limit/offset, and filtered count all verified.
- **Dual-dialect from one code path** — placeholder format (`?` vs `$N`), `LIKE` vs `ILIKE`,
  and `COLLATE NOCASE` vs `LOWER()` are chosen by dialect, mirroring the Rust
  `#[cfg(feature = "postgres")]` branches. (Postgres execution still to be run in WS4.)

Caveat: this is one repository. The ~159 repos, ~5 window-function views, and the
`define_linked_tables!` code-generation are the bulk of the porting effort — but no novel
blocker surfaced; it's mechanical, repetitive work well suited to a generator.

## Dual-backend (WS4) — same code path proven on real Postgres 16 + SQLite

`internal/repository/crossdb_test.go` runs **one** suite (`runInvoiceSuite`) against both
backends: migrate from the real base dump → seed → exercise merge resolution, case-insensitive
filter+sort, count, pagination. Both pass. Run Postgres locally with
`scripts/run-postgres-tests.sh` (spins up a throwaway PG16 cluster, runs, tears down).

Proven on Postgres: the 312KB `postgres_latest.sql` base bootstraps (via pgx **simple
protocol** for multi-statement Exec — `internal/db/connect.go`), the migration runner applies
the ported migration, the `invoice_view` rebuild runs, and the repository's dialect branches
engage (`$N` placeholders, `ILIKE`, `LOWER()`). SQLite is opened with `foreign_keys=ON` + WAL
to match the Rust app (`database_settings.rs`).

**Four real SQLite↔Postgres divergences the spike surfaced (a naive port would hit these):**
1. **View validation timing** — SQLite validates view column refs *lazily* (at query); Postgres
   *eagerly* (at `CREATE VIEW`). A premature view rebuild silently succeeds on SQLite, errors on PG.
2. **Column defaults differ** — `name.type` has `DEFAULT 'FACILITY'` in the SQLite base but the
   Postgres `name_type` column has no default.
3. **FK enforcement** — Postgres always enforces; SQLite only with `PRAGMA foreign_keys=ON`
   (the Rust app sets it — so the Go port must too, or behavior silently diverges).
4. **Nullability differs** — `store.name_link_id` is NOT NULL in SQLite, nullable in Postgres.

Takeaway: dual-dialect from one code path is very achievable (squirrel + a small `Rebind` +
per-dialect SQL where needed), but the two committed base schemas are **not** identical — the
port needs a schema-parity audit, which a diff harness can drive.

## Database + migrations (WS3/WS4) — core mechanism proven

- **Pure-Go SQLite driver loads the real production schema.** `modernc.org/sqlite` executed
  the real 208KB `sqlite_latest.sql` dump and produced a schema **byte-identical** to the
  sqlite3 C library (114 tables / 114 indexes / 28 views / 256 objects, **0 differences**).
  Strong signal that the no-CGO driver is viable and behavior-compatible for the base schema.
- **Migration runner ported faithfully** (`internal/migrations`), mirroring
  `server/repository/src/migrations/mod.rs`:
  - empty-DB bootstrap from the embedded base dump (earliest vs latest, matching Rust);
  - version tracking in `key_value_store` (`id='DATABASE_VERSION'`, the
    `SCREAMING_SNAKE_CASE` of the Rust `KeyType` enum);
  - `migration_fragment_log` keyed `"{version}-{identifier}"` — **byte-identical** to Rust's
    `MigrationFragmentLogRepository`;
  - one-time + idempotent-fragment semantics, views drop/rebuild hook.
  - `{DOUBLE}`/`{DATETIME}`/… type-token substitution (the Go equivalent of the Rust `sql!`
    macro + `types.rs`), with the per-dialect SQLite/Postgres branch.
- **Demonstrated end-to-end:** bootstrap from the real v2.15.0 base → apply a real ported
  migration (`v2.19.0 / add_ancillary_item_table`) → correct SQLite DDL (`item_quantity REAL`),
  `DATABASE_VERSION='2.19.0'`, exact fragment-log key, **217 historical fragment rows carried
  forward** (as Rust does), idempotent re-run. (`internal/migrations/runner_test.go`)
- **Version parsing/ordering** ported with the Rust unit tests transcribed verbatim — pass.

## What this implies for the full port (estimates, not yet measured)

- **Migrations:** porting v2.15.0(base)→latest is **39 migration files**. Most are raw SQL
  liftable verbatim; the ~12% with Rust control-flow need hand-porting. Supporting upgrades
  from genuinely old DBs (e.g. 2.11.0) requires the full v1.3.0→latest chain (~404 files) —
  large but mechanical, and a schema-diff harness can drive it (diff Go-migrated vs
  Rust-migrated → the diff *is* the to-do list).
- **GraphQL + repository:** the patterns transfer (gqlgen + sqlc + squirrel/goqu), but the
  ~159 repositories, the `define_linked_tables!` core/view pattern, dynamic filter/sort, and
  ~5 complex views are real work and the bulk of the effort.

## JS engine for reports & plugins (WS5) — pure-Go wins; CGO not needed

The open question was whether the Boa JS engine (report `convert_data` + backend plugins) must
stay in Rust and be called via CGO — which would erode the compile-time + cross-compile win.
Answer: **no.** A pure-Go JS engine (`github.com/dop251/goja`) handles both, with no CGO.

- **Reports (leaf).** goja runs the **real webpack-built** `encounters` convert_data bundle
  correctly with `CGO_ENABLED=0` (`internal/reports/goja_engine.go`, `goja_test.go`). Boa
  compiled as a Rust staticlib and called via CGO also runs it, **byte-identical** to goja
  (verified before reclaiming the build dir) — so both work; goja just avoids CGO.
- **Plugins (non-leaf).** goja injects host methods (`sql`, `use_graphql`, …) as ordinary **Go
  closures** via `vm.Set`. A plugin-style bundle calling `sql(...)` got Go-supplied rows back
  (`goja_host_test.go`) — pure-Go, **no bidirectional FFI needed**. (A Boa-CGO Rust→Go callback
  is scaffolded in `ffi/boa` as the fallback path but wasn't rebuilt — see disk note below.)

**Build + cross-compile cost (the crux), measured:**

| | pure-Go (goja) | CGO + Boa (Rust) |
|---|---|---|
| Cross-compile darwin/arm64, linux/amd64, **linux/arm64**, **android/arm64**, **windows/amd64** | **5/5, zero extra toolchain** | fails out-of-box at Go's own `runtime/cgo` (host clang can't target other OS) |
| Toolchain to make cross-compile work | none | install `zig` + `rustup target add` per arch + wire `zig cc` as cargo linker + cross-build a 39–52MB staticlib per arch + `CC=zig-cc` + per-target `CGO_LDFLAGS` (proven for linux/arm64) |
| Clean build time added | none | ~50s (Boa staticlib, 124 deps) |
| Binary size | 15 MB | 30 MB |

**Recommendation:** run the JS subsystem in **pure-Go goja** (reports + plugins). This keeps
the JS workload entirely CGO-free, so the fast builds and zero-setup `GOOS/GOARCH`
cross-compilation are fully preserved. Boa-via-CGO stays a fallback only if a specific bundle
hits a goja ES-feature gap or needs exact Boa semantics.

Risks to validate later: goja is ES5.1 + partial ES6 — it ran the project's (webpack-bundled)
output, and the project already controls bundling, but ES2015+ sources should target ES5.1;
and JS-engine edge-case semantics (Boa vs goja) should be spot-checked per bundle.

**Implication for sync (deferred):** because the JS subsystem does **not** force CGO into the
build, keeping the 47K-LOC sync engine in Rust would *newly* introduce CGO + the cross-compile
penalty above (and bidirectional FFI, since sync touches the whole repository/service layer).
That weakens the "Rust island" case — lean toward porting sync to Go.

## Runtime load test (WS6) — Rust vs Go on Postgres (real head-to-head)

Both servers ran against **the same Postgres DB** (`demoivory_lt`, a protected copy of an
initialised production-shaped DB migrated to 2.19.x; the originals `afg`/`demoivory` were never
modified). Both serve the real `invoices` query; k6 at 50 VUs. Rust = **release** `remote_server`
(postgres feature, HTTPS); Go = pure-Go gqlgen server (HTTP). Both received the **byte-identical
GraphQL document** — a single page (`first: 50`) of `invoices`, sorted, **including the
`otherParty` DataLoader field** so each server's loader is exercised. **All testing ran with
auth/authorization disabled** on both (the Rust `is_develop()` gate on `debug_no_access_control`
was temporarily removed for the test and reverted; the Go slice has no auth layer).

| scenario | Rust (rps / med / p95) | Go (rps / med / p95) | bottleneck |
|---|---|---|---|
| framework `{__typename}` (no DB, no loader) | **88,125** / 0.3 ms / 1.4 ms | 44,477 / 0.7 ms / 3.2 ms | server (Rust ~2×) |
| small query (22 invoices + loader) | **1,373** / 32 ms / 73 ms | 1,015 / 46 ms / 98 ms | server; Rust ahead |
| big query (1.0M invoices + loader) | 20 / 2.4 s / 3.45 s | **30** / 1.8 s / 2.24 s | **Postgres** |
| raw PG cost of the big count | — | — | 135 ms / query |

How to read it:
- **Framework end:** Rust ~2× Go on raw per-request overhead. A genuine Rust advantage.
- **Small real query (with loader):** Rust ahead — 1,373 vs 1,015 rps; both ~1k rps, server-bound.
- **Big query (the production-relevant case):** both collapse to **~20–30 rps** — Postgres is
  the wall (one count over the joined view = 135 ms; 50 concurrent saturate the single PG). The
  language is **not** the bottleneck; Go is even slightly ahead. **This confirms the hypothesis:
  at scale the database limits throughput, not Go.**

**Same data back?** Small store: **byte-identical** (5,925 B, loader-resolved names included).
Large store initially differed by one row — Rust applies a default `is_cancellation = false`
filter (`service/src/invoice/query.rs`) the slice hadn't replicated (that store has one cancelled
invoice). **Added it to the Go slice; both now return exactly 1,004,135**, and the load timings
were unchanged (Go ~30 vs Rust ~21 rps) — so the throughput gap is *not* the filter; it's
implementation detail (Go selects only requested columns; Rust loads the full invoice row; HTTPS
vs HTTP), Postgres-bound regardless. (`is_cancellation = false` is the *only* default filter
`get_invoices` injects beyond `store_id`.)

Fairness caveats: the servers don't send byte-identical SQL (the Go spike's `invoices` query
selects fewer fields than Rust's full resolver); Rust used HTTPS vs Go HTTP (negligible at these
latencies, connections reused); auth bypassed on both. So read the big-query Go-ahead as "same
order, PG-bound," not a precise language win. Getting the Rust server here required a copy + a
version-skew workaround + removing the release auth gate — see the data-access friction below.

### Footprint / build comparison (full server)

| | Rust `remote_server` | Go server |
|---|---|---|
| cold build (release) | **15m (sqlite) / 17m 45s (postgres)** | **~10 s** |
| incremental rebuild | 33 s (mid crate) / **185 s (top `server` crate)** | 0.1–0.5 s |
| binary size | **273–274 MB** | 48 MB |
| `target/` build dir on disk | **5.7 GB per feature** (+5.7 GB for the postgres `target-postgres/`) | 121 MB shared cache |
| startup → serving | 0.3–0.6 s | 0.18 s |
| idle RSS | 73 MB | 53 MB |
| framework throughput | 88k rps | 44k rps |

Net: **Rust wins runtime efficiency** (≈2× framework throughput, lower latency, smaller idle
RSS); **Go wins the development economics decisively** (90× faster cold build, ~16–60× faster
incremental + test loop, 6× smaller binary, ~40× smaller build footprint, trivial
cross-compile). The choice is an efficiency-vs-iteration-velocity trade, and the spike's
premise was that iteration velocity (compile/test/disk) is the current pain.

## totalCount strategies (WS6 follow-up) — the big-query wall is the COUNT, and it's fixable

The ~20–30 rps collapse on the 1M-invoice store is **entirely the exact COUNT behind
`totalCount`**, not the page query and not the server language. EXPLAIN ANALYZE on
`demoivory_lt` split it: with a composite index `(store_id, invoice_number)` the 50-row page
query is **<1 ms**; the exact COUNT (seq scan + invoice→name_link join over 1M rows) is
~75–110 ms in psql and ~250–280 ms measured at the API, and the resolver ran it **eagerly on
every request**.

Index notes (applied to `demoivory_lt` only — production would need a migration):
- Added `idx_invoice_store_sort (store_id, invoice_number)` → page query <1 ms.
- **Dropped `index_invoice_invoice_number`** — it was actively harmful for this query: the
  planner walked the whole-table invoice_number index and post-filtered (707 rows discarded
  per page) instead of using the composite.
- **Indexes do NOT speed up the exact COUNT**: counting 1M matching rows visits 1M rows
  regardless; Postgres already picks a parallel seq scan as the cheapest plan (~75 ms beats
  any index path tried, incl. partial and covering indexes).

Three count strategies were implemented in the **Rust server** behind an env switch
(`OMS_INVOICE_COUNT=exact|estimate|cache`, spike-only) plus a lazy skip, and load-tested on
the 1M store (50 VUs / 20 s, same binary, same DB, auth bypassed via a develop-mode build):

| scenario (Rust, 1M-row store) | rps | p95 | count accuracy |
|---|---|---|---|
| baseline: exact COUNT every request | 21 | 3.7 s | exact |
| **A — planner estimate** (`EXPLAIN (FORMAT JSON)` → `Plan Rows`) | **1,467** | 51 ms | 1,004,007 vs 1,004,135 actual (0.013% off) |
| **C — in-memory cache** (keyed by filter, cleared on invoice writes) | **1,664** | 47 ms | exact (until next write) |
| **B — client caches count** (rows-only + 1-in-25 exact counts) | 300 | 634 ms | exact, refreshed per filter change |
| B ceiling: rows-only (count never requested) | 1,884 | 40 ms | n/a |
| **A+B combined** (lazy client + estimate server) | 1,790 | 44 ms | estimate |

Implementation (all in the Rust server, ~200 lines total):
- `repository/src/db_diesel/estimated_count.rs`: `Explained<T>` diesel `QueryFragment` wrapper
  (binds preserved, no SQL interpolation); `InvoiceRepository::count_fast` returns the planner
  estimate, re-checking with an exact count when the estimate is <10k (cheap when small,
  self-corrects wrong-low estimates). **Postgres-only** (`#[cfg(feature = "postgres")]`);
  SQLite has no cheap estimator and falls back to exact. NOTE: SQLite remotes are not always
  small — sites with 100k+ prescriptions exist. Measured on SQLite (warm, dev hardware): the
  production-shaped count (view + name join) costs ~25 ms at 100k rows / ~260 ms at 1M, but
  ~13× of that is the name_link join — counting the invoice table directly is 1.8 ms / 24 ms.
  SQLite's levers are therefore the skip-the-join count (valid whenever the filter doesn't
  touch the customer name — not yet implemented), option C, and option B.
- `repository/src/db_diesel/invoice_count_cache.rs`: process-wide `HashMap<filter, count>`,
  cleared in `InvoiceRowRepository::upsert_one`/`delete` (covers sync via the `Upsert` impl).
  Caveats: per-process (multi-instance deployments would serve stale counts), and a busy
  central server syncing invoices continuously will clear it constantly — hit rate under real
  sync load is unmeasured.
- `graphql/invoice`: `ctx.look_ahead().field("totalCount").exists()` skips the COUNT entirely
  when the client doesn't select it (verified: works through the `... on InvoiceConnector`
  union fragment; rows-only requests dropped from ~280 ms to ~17 ms).
- `service/invoice/query.rs` `clamp_count_to_page`: corrects the count against the page result
  (which is ground truth and already in hand). A wrong-LOW estimate would otherwise make
  trailing pages unreachable — the UI derives its page count from totalCount and disables
  next-page past it. The clamp guarantees: a full page past the reported count bumps the count
  (`offset + rows + 1`, next page stays reachable — the count refines as the user browses); a
  non-empty short page proves the exact total and snaps the count to it (also fixes wrong-HIGH
  estimates when the real last page is reached). Exact counts are never altered.
- k6: `bench/load/invoices_lazy.js` simulates a client that fetches count separately
  (per-filter cache) — counts depend only on the filter, never sort/page.

Read on the options (for production):
- **A (estimate)** is the best effort-to-value: one repository method, no invalidation logic,
  no frontend change, 70× throughput. Costs: count is approximate above the threshold (UI
  shows it as exact), and stale `pg_class` statistics skew it until autovacuum ANALYZEs —
  worst case ~10% off right after a bulk load (`autovacuum_analyze_scale_factor` default).
  The page clamp (above) removes the dangerous consequence (unreachable tail pages); a
  scheduled `ANALYZE invoice` after bulk operations bounds the cosmetic error. Postgres-only.
- **C (cache)** keeps counts exact and is marginally faster than A, but invalidation is the
  classic hard part: per-process only, and continuous sync writes on a central server may
  gut the hit rate. Needs a real-traffic measurement before trusting it.
- **B (client-side)** reaches the same ceiling *combined with A or C*, keeps the API exact,
  and additionally removes the count from every page navigation — but requires frontend
  changes (separate cached count query) and benefits Postgres and SQLite alike.
- Strategies compose: **A or C server-side now** (flag-gated), **B as the frontend follow-up**.

Fairness caveats for this matrix: single local Postgres 16, warm cache, one filter shape
(store_id + is_cancellation); the auth layer was bypassed (develop-mode build, as in the WS6
baseline). Separately noted: the earlier Rust-vs-Go comparison has a **connection-pool
asymmetry** — Rust caps its r2d2 pool at 10 connections (`base.yaml
connection_pool_max_connections: 10`) while the Go spike's `database/sql` pool is unbounded
(no `SetMaxOpenConns`), so under 50 VUs Go could use ~50 PG connections to Rust's 10. Go's
big-query "lead" (30 vs 20 rps) is partly that, not language speed; the strategy matrix above
is unaffected (Rust-only, pool constant).

## Still required before a go/no-go (open workstreams)

- WS5 finish (optional): rebuild the Boa-CGO Rust→Go `sql` callback (code scaffolded) — blocked
  only by disk; not needed given the goja host-function result.
- WS6 load test: identical query set, p50/p95/p99, throughput, memory, startup.
- Sync engine: the dominant remaining effort/risk; not yet prototyped.

## Trade-off: weaker compile-time guarantees in Go (a real Rust advantage)
Rust's exhaustive `match` + full struct destructuring catch "added a field/variant, forgot to
handle it everywhere" **at compile time** — a new filter field won't compile until it's applied,
and unused fields warn under `deny(warnings)`. Go does **not**: an unused struct field or a
non-exhaustive `switch` compiles silently. We hit exactly this — the `is_cancellation` filter
field added but not translated to SQL — and caught it via a **data-parity diff, not the
compiler**. Mitigations (none compiler-equivalent): the `exhaustive` linter (CI), disciplined
tests, or code-generating the filter→SQL mapping from one source of truth. The core trade: **Rust
= compile-time correctness at the cost of build speed; Go = iteration speed at the cost of weaker
static guarantees.** For a data-integrity-critical system this is a genuine factor, and it raises
the bar on test coverage + codegen for any Go port.

## Tentative read
Nothing found argues against the port. The compile-time win is decisive; GraphQL + DB parity
are reproducible (WS1–WS4); and the JS subsystem runs **pure-Go (no CGO)**, so the build/
cross-compile advantages survive intact (WS5). The dominant remaining risk is the **effort and
correctness of porting the sync engine** — and WS5 makes a Rust-CGO sync island *less*
attractive, since it would reintroduce the cross-compile cost the rest of the port avoids.
