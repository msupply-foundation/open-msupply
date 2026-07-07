# Diesel batch insert / upsert benchmarks

Microbenchmarks comparing different ways to bulk-write rows through Diesel on
both **SQLite** and **PostgreSQL**, to figure out what's actually worth doing
when you have a batch of rows to insert or upsert.

Two headline questions:

1. **On SQLite**, when is `INSERT … ON CONFLICT DO UPDATE` worth doing as raw
   SQL instead of via Diesel's typed DSL? — Answer: **for upserts, always**
   (~3–4×). Diesel can't batch `on_conflict` into one statement on SQLite, so
   the typed DSL forces a per-row prepare/bind/step cycle (see
   [diesel-rs/diesel#1822][1]). For plain inserts the gap is small.
2. **On Postgres**, does raw SQL buy you anything over the typed DSL? —
   Answer: **no, they're tied**. Postgres' typed batch upsert produces the
   same single multi-row statement raw SQL would. The thing you must avoid on
   PG is the per-row loop — every statement is a network roundtrip, so it's
   ~14× slower than the batched form.

## Methods compared

### Inserts (against an empty table)

| name | backends | what it does |
|---|---|---|
| `batch` | both | `insert_into(t).values(&Vec<T>).execute()` — typed Diesel batch. On Postgres this is one multi-row INSERT; on SQLite, Diesel rewrites it into N single-row INSERTs at execution time. |
| `loop` | both | Manual `for row in rows { insert_into(t).values(row).execute() }` inside a single transaction. |
| `raw` | both | One raw `INSERT INTO t (…) VALUES (?,?,?,?), (?,?,?,?), …` statement built with `diesel::sql_query` and bound params. (`?` placeholders on SQLite, `$1,$2,…` on Postgres.) |

### Upserts

| name | backends | what it does |
|---|---|---|
| `individual` | both | Per-row Diesel typed DSL `insert_into(t).values(row).on_conflict(id).do_update().set(…)` in a transaction. |
| `batch` | postgres only | Typed Diesel multi-row `insert_into(t).values(&Vec<T>).on_conflict(id).do_update().set(…)`. **Doesn't compile on SQLite** — Diesel can't compose batched values with `OnConflict` for the SQLite backend. |
| `raw` | both | One raw `INSERT … VALUES (…),(…),… ON CONFLICT(id) DO UPDATE SET …` statement built with `diesel::sql_query`. |

The upsert bench is repeated for **0%, 40%, and 80%** pre-existing rows so we
can see how much of the speedup is "raw is a fast plain insert" vs "raw is a
fast actual upsert". For 40%/80% runs we pre-populate the matching prefix of
the timed batch, so those rows hit the `DO UPDATE` path and the rest hit the
plain INSERT path — same as a real sync-style workload.

All methods run inside `conn.transaction(|c| …)` so commit cost is paid once
per call, not per row.

## How to run

```bash
# default: sqlite, file-backed at /tmp/batch-upsert-bench.sqlite (WAL + synchronous=NORMAL)
cargo run --release

# in-memory sqlite (no disk I/O)
DATABASE_URL=:memory: cargo run --release

# point sqlite at a different file
DATABASE_URL=/path/to/bench.sqlite cargo run --release

# postgres (defaults: bench DB postgres://postgres@localhost/batch_upsert_bench,
# admin DB postgres://postgres@localhost/postgres). The bench DB is dropped
# and re-created at startup automatically.
cargo run --release --no-default-features --features postgres

# override either or both URLs
DATABASE_URL=postgres://user:pass@host/some_bench_db \
ADMIN_DATABASE_URL=postgres://user:pass@host/postgres \
  cargo run --release --no-default-features --features postgres
```

The harness wipes and re-creates the table on startup (or, for postgres,
drops + creates the entire bench database via the admin connection), runs 1
warm-up + 7 timed iterations per (size, method, ratio) cell, and prints
min / median / mean / max plus rows-per-second based on the median.

Sizes: `10, 100, 1_000, 10_000`.

## Results

All numbers below are from one machine: Apple M3 Pro, macOS 14.6.

### SQLite

SQLite via bundled `libsqlite3-sys`, file-backed `/tmp/batch-upsert-bench.sqlite`
with `journal_mode=WAL` and `synchronous=NORMAL`. `cargo run --release`.

```
backend = sqlite, iters per cell = 7 (+ 1 warm-up), storage = /tmp/batch-upsert-bench.sqlite

=== INSERT (empty table) ===
    rows  method          min(ms)  median(ms)    mean(ms)     max(ms)      rows/sec
---------------------------------------------------------------------------------
      10  batch             0.027       0.027       0.028       0.029        364179
      10  loop              0.025       0.026       0.034       0.052        388984
      10  raw               0.046       0.047       0.049       0.054        212017

     100  batch             0.302       0.306       0.307       0.313        326397
     100  loop              0.257       0.260       0.260       0.266        384800
     100  raw               0.188       0.190       0.191       0.195        526316

    1000  batch             1.697       2.172       2.135       2.439        460379
    1000  loop              1.578       1.676       1.656       1.710        596659
    1000  raw               1.170       1.221       1.787       5.303        819001

   10000  batch            13.731      14.070      14.647      17.935        710719
   10000  loop             13.415      13.687      14.020      16.382        730645
   10000  raw              10.460      10.834      11.848      14.684        923027


=== UPSERT (0% pre-existing → conflict path) ===
    rows  method          min(ms)  median(ms)    mean(ms)     max(ms)      rows/sec
---------------------------------------------------------------------------------
      10  individual        0.052       0.053       0.053       0.056        190324
      10  raw               0.022       0.023       0.023       0.025        438770

     100  individual        0.406       0.409       0.409       0.416        244648
     100  raw               0.110       0.110       0.111       0.114        908744

    1000  individual        3.962       3.987       3.985       4.012        250807
    1000  raw               1.018       1.038       1.048       1.085        963120

   10000  individual       39.176      39.589      39.981      42.630        252596
   10000  raw              10.544      10.717      11.216      14.098        933090


=== UPSERT (40% pre-existing → conflict path) ===
    rows  method          min(ms)  median(ms)    mean(ms)     max(ms)      rows/sec
---------------------------------------------------------------------------------
      10  individual        0.052       0.056       0.055       0.060        179507
      10  raw               0.023       0.024       0.024       0.025        417397

     100  individual        0.410       0.413       0.418       0.442        241862
     100  raw               0.113       0.116       0.120       0.139        864237

    1000  individual        4.073       4.361       4.591       6.420        229305
    1000  raw               1.094       1.131       1.128       1.164        884108

   10000  individual       40.804      42.707      43.032      46.104        234155
   10000  raw              12.742      13.013      13.934      17.565        768450


=== UPSERT (80% pre-existing → conflict path) ===
    rows  method          min(ms)  median(ms)    mean(ms)     max(ms)      rows/sec
---------------------------------------------------------------------------------
      10  individual        0.049       0.050       0.050       0.052        199005
      10  raw               0.020       0.021       0.021       0.023        477122

     100  individual        0.424       0.427       0.433       0.456        233964
     100  raw               0.105       0.108       0.108       0.112        923788

    1000  individual        3.945       4.215       4.650       7.960        237274
    1000  raw               1.102       1.113       1.131       1.238        898842

   10000  individual       39.683      41.063      41.348      43.505        243531
   10000  raw              13.898      14.435      14.933      17.104        692783
```

### Postgres

PostgreSQL 17.2 (Postgres.app) on the same machine, connected over the local
TCP socket. Bench database (`batch_upsert_bench`) is dropped and re-created at
startup. `cargo run --release --no-default-features --features postgres`.

```
backend = postgres, iters per cell = 7 (+ 1 warm-up), storage = postgres://postgres@localhost/batch_upsert_bench

=== INSERT (empty table) ===
    rows  method          min(ms)  median(ms)    mean(ms)     max(ms)      rows/sec
---------------------------------------------------------------------------------
      10  batch             0.203       0.328       0.313       0.408         30472
      10  loop              0.669       0.711       0.737       0.855         14057
      10  raw               0.228       0.233       0.257       0.373         42949

     100  batch             0.770       0.896       1.080       2.358        111633
     100  loop              2.745       2.917       3.470       5.325         34287
     100  raw               0.613       0.648       0.809       1.544        154381

    1000  batch             7.428       7.528       7.740       8.198        132841
    1000  loop             31.907      33.552      34.023      35.985         29805
    1000  raw               7.351       7.494       7.588       8.155        133448

   10000  batch            92.747      98.053      98.868     104.493        101985
   10000  loop            372.287     375.818     374.961     377.080         26609
   10000  raw              91.029     102.832     101.713     107.852         97246


=== UPSERT (0% pre-existing → conflict path) ===
    rows  method          min(ms)  median(ms)    mean(ms)     max(ms)      rows/sec
---------------------------------------------------------------------------------
      10  individual        0.913       0.949       0.980       1.111         10535
      10  batch             0.336       0.351       0.373       0.514         28463
      10  raw               0.356       0.384       0.405       0.560         26070

     100  individual        4.685       7.123       6.617       8.007         14040
     100  batch             1.746       1.955       1.943       2.246         51153
     100  raw               1.714       1.842       1.872       2.129         54302

    1000  individual       50.596      52.080      52.643      54.511         19201
    1000  batch            16.606      17.225      17.209      17.839         58055
    1000  raw              16.008      17.633      17.614      19.622         56711

   10000  individual      549.124     554.298     554.189     558.289         18041
   10000  batch           176.154     178.658     180.696     188.222         55973
   10000  raw             173.379     177.830     178.594     185.353         56233


=== UPSERT (40% pre-existing → conflict path) ===
    rows  method          min(ms)  median(ms)    mean(ms)     max(ms)      rows/sec
---------------------------------------------------------------------------------
      10  individual        0.935       1.048       1.048       1.180          9541
      10  batch             0.335       0.354       0.375       0.536         28209
      10  raw               0.335       0.347       0.346       0.354         28798

     100  individual        6.440       7.144       7.175       8.189         13997
     100  batch             1.471       1.640       1.653       2.025         60963
     100  raw               1.423       1.633       1.660       1.924         61225

    1000  individual       49.882      52.180      52.747      55.683         19164
    1000  batch            17.409      17.570      18.272      22.433         56915
    1000  raw              17.286      18.820      18.759      20.631         53135

   10000  individual      559.726     562.230     562.159     563.888         17786
   10000  batch           193.310     199.336     198.859     202.858         50167
   10000  raw             189.462     197.650     195.621     199.479         50594


=== UPSERT (80% pre-existing → conflict path) ===
    rows  method          min(ms)  median(ms)    mean(ms)     max(ms)      rows/sec
---------------------------------------------------------------------------------
      10  individual        0.953       0.996       1.027       1.152         10039
      10  batch             0.321       0.339       0.393       0.515         29480
      10  raw               0.312       0.324       0.344       0.477         30872

     100  individual        6.922       7.583       7.583       8.136         13187
     100  batch             1.263       1.648       1.609       1.882         60664
     100  raw               1.238       1.511       1.527       1.859         66187

    1000  individual       52.415      53.937      54.009      55.733         18540
    1000  batch            18.315      18.791      18.949      20.383         53217
    1000  raw              19.232      20.001      20.153      21.023         49997

   10000  individual      556.754     561.918     561.456     566.584         17796
   10000  batch           208.524     212.970     217.010     231.871         46955
   10000  raw             194.240     200.132     199.289     203.238         49967
```

## Takeaways

### SQLite — inserts: small, shrinking gap

| size | raw vs loop |
|---:|---:|
| 100 | 1.37× |
| 1k | 1.37× |
| 10k | 1.26× |

For plain inserts on SQLite, raw multi-row VALUES is faster than Diesel's typed
batch, but the gap is modest and shrinks as batch size grows — by 100k rows
(see "Earlier exploration" below) they're effectively equal because SQLite's
own write path dominates. **Not usually worth giving up the typed DSL.**

### SQLite — upserts: large, durable gap

| size | individual median | raw median | speedup |
|---:|---:|---:|---:|
| 10k @ 0% | 39.6 ms | 10.7 ms | **3.70×** |
| 10k @ 40% | 42.7 ms | 13.0 ms | **3.28×** |
| 10k @ 80% | 41.1 ms | 14.4 ms | **2.85×** |

Two things to notice:

1. **`individual` per-row cost is flat** — ~4 µs/row regardless of batch size
   or conflict ratio. That's pure per-statement overhead (Diesel's typed
   `on_conflict` chain + SQLite prepare/bind/step). The conflict ratio doesn't
   even change it, because the work each statement does is roughly the same
   whether the row exists or not.

2. **`raw` per-row cost grows with conflicts.** At 0% conflicts raw matches a
   plain insert (~1.07 µs/row). At 80% it costs ~1.44 µs/row — the extra is
   the actual UPDATE cost paid by the rows that existed.

So the speedup is largest in the "mostly new rows" case (raw inherits the
plain-insert path) and shrinks toward a floor as conflicts dominate. It never
collapses — at 80% conflicts you still get ~3× because the ~4 µs/row Diesel
overhead doesn't go away.

### Postgres — never loop, batch ≈ raw

Different shape from SQLite because every statement is a TCP roundtrip:

| size | batch | loop | raw | loop vs batch |
|---:|---:|---:|---:|---:|
| 1k inserts | 7.5 ms | 33.6 ms | 7.5 ms | **4.5× slower** |
| 10k inserts | 98.1 ms | 375.8 ms | 102.8 ms | **3.8× slower** |

The `batch` and `raw` paths are within noise of each other (Diesel's typed
multi-row INSERT generates the same SQL the raw path would), but the per-row
`loop` is brutal on PG — each statement pays a localhost network roundtrip.

For upserts, the same shape holds but with `individual` (per-row upsert)
playing the role of "loop":

| size, ratio | individual | batch | raw | individual vs batch |
|---:|---:|---:|---:|---:|
| 10k @ 0% | 554.3 ms | 178.7 ms | 177.8 ms | **3.1× slower** |
| 10k @ 40% | 562.2 ms | 199.3 ms | 197.7 ms | **2.8× slower** |
| 10k @ 80% | 561.9 ms | 213.0 ms | 200.1 ms | **2.6× slower** |

Diesel's typed `batch` upsert is ~3× faster than the per-row form, and raw
SQL gives you nothing on top of that. **Just use the typed DSL.**

### Practical guidance

| backend | inserts | upserts |
|---|---|---|
| SQLite | typed `batch` or `loop` (raw not worth the trade-off) | **raw multi-row `INSERT … ON CONFLICT DO UPDATE`** — ~3–4× faster than the typed per-row form, at every realistic batch size |
| Postgres | typed `batch` (the `loop` is ~4× slower — never use it for bulk writes) | typed `batch` upsert (raw equals batch, no point giving up type checks) |

The SQLite raw-upsert trade-off: lose Diesel's type checks on the column list
and manage placeholders by hand. The ~3× speedup makes it worth it on hot
upsert paths but not for one-off code.

## Earlier exploration: 100k rows

Including this here because it changes the picture for inserts but not much
for upserts. From an earlier run with `sizes = [..., 100_000]`:

```
=== INSERT ===
  100000  batch     145.0  148.7  149.8  155.6  ms   ~672k rows/sec
  100000  loop      144.1  144.7  145.0  146.1  ms   ~691k rows/sec
  100000  raw       133.6  144.0  144.2  155.7  ms   ~694k rows/sec     ← raw equals loop

=== UPSERT (100% pre-existing) ===
  100000  individual 433.7 448.2 446.0 453.8  ms   ~223k rows/sec
  100000  raw        174.9 186.2 183.6 191.4  ms   ~537k rows/sec       ← raw still 2.4× faster
```

At 100k inserts, the per-row Rust/binding overhead is fully amortized by
SQLite's own write cost — raw stops being worth it. At 100k upserts, the ~4 µs
per-row Diesel-DSL overhead is still big enough relative to SQLite's update
cost to keep raw ~2.4× ahead. The gap is converging toward 1× but slowly.

## Files

- [`src/main.rs`](src/main.rs) — bench harness and method implementations.
- [`src/schema.rs`](src/schema.rs) — Diesel schema for the `users` table.
- [`Cargo.toml`](Cargo.toml) — feature flags `sqlite` (default) and `postgres`.
- [`.vscode/settings.json`](.vscode/settings.json) — switch rust-analyzer
  between the two backends by editing the `features` array.

## Caveats

- Numbers are from one machine; absolute values won't match yours but the
  ratios should be in the same ballpark.
- File-backed SQLite is configured with `WAL` + `synchronous=NORMAL`, which is
  realistic for a write-heavy app but not the most-durable setting (`FULL`).
- Both methods commit once per call, so disk fsync cost is identical between
  them — this bench is measuring per-row CPU/syscall overhead and (on
  Postgres) per-statement network roundtrips, not commit cost. With many
  small transactions instead of one big one, the picture is different
  (commit fsync would dominate).
- The `UpsertBatch` (typed multi-row upsert) method exists only on Postgres —
  it doesn't compile on SQLite because Diesel can't compose `BatchInsert`
  with `OnConflictValues` for the SQLite backend (see
  [diesel-rs/diesel#1822][1]). That's the whole reason the SQLite `raw`
  upsert path exists.
- Postgres results are over a localhost TCP socket. With a Unix-socket
  connection the per-roundtrip cost would be lower, narrowing the
  loop-vs-batch gap somewhat — but the relative ordering of the methods
  shouldn't change.

[1]: https://github.com/diesel-rs/diesel/issues/1822
