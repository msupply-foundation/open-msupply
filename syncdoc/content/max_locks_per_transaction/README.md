# max_locks_per_transaction demo (Docker Postgres + Rust/diesel)

Maps out **when** the Postgres error you hit inside a transaction starts:

```text
ERROR: out of shared memory
HINT:  You might need to increase "max_locks_per_transaction".
```

as a set of matrices: **`max_locks_per_transaction`** (rows) vs. **number of
writes to foreign-key child tables in one transaction** (columns). No explicit
`LOCK`, no DDL inside the measured transaction — just ordinary `INSERT` /
`UPDATE`.

## Why this exists — the open-mSupply problem

Sync integration is **atomic by batch**: the whole sync buffer is integrated
inside a single Postgres transaction so all records become visible together and
logical integrity holds (an invoice and its lines, a stock line and its ledger,
never seen half-applied). A large integration — a v7 migration of a data file,
or a store being moved onto a site — writes across many tables in that one
transaction and exhausts the shared lock table, producing exactly the error
above. Reported in
[#11826](https://github.com/msupply-foundation/open-msupply/issues/11826) on a
remote site with 7 active stores migrating v6 → v7.

The key fact this demo establishes: the lock cost is per **distinct relation**
(table — and, for `UPDATE`, every index on it), **held until commit**, *not* per
row. So batching rows doesn't help; the number of distinct relations touched in
one transaction is what matters. This is **Postgres-only** — SQLite uses
serializable isolation with a single writer and no shared lock table.

The options for solving it (raise the setting, drop the transaction, transaction
grouping, the combined `is_synced` + persisted virtual safe-cursor approach) and
the decision are written up in the KDD:
[decisions/2026-06-03_max_locks_per_transaction.md](../../../decisions/2026-06-03_max_locks_per_transaction.md).
This demo is the measurement backing for that KDD's context.

## The demo

Six matrices vary three things to show how each moves the threshold:

| matrix | write  | child indexes | max_connections |
| ------ | ------ | ------------- | --------------- |
| 1      | INSERT | PK only       | 20              |
| 2      | UPDATE | PK only       | 20              |
| 3      | INSERT | PK + 1 index  | 20              |
| 4      | UPDATE | PK + 1 index  | 20              |
| 5      | INSERT | PK only       | 5               |
| 6      | UPDATE | PK only       | 5               |

## Run it

```sh
./run.sh
```

`run.sh` starts eight throwaway Postgres containers (data on `tmpfs`), runs the
sweep, and tears them down. Takes ~40s. Example output (flip points vary a little
run to run):

```text
INSERT  |  child: PK only       |  max_connections=20
  max_locks_per_txn │   100   200   300   400   600   800  1000  1250  1500  1750  2000
  ──────────────────┼──────────────────────────────────────────────────────────────────
                 16 │    ok    ok    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR
                 32 │    ok    ok    ok    ok    ok    ok   ERR   ERR   ERR   ERR   ERR
                 48 │    ok    ok    ok    ok    ok    ok    ok    ok    ok    ok    ok
                 64 │    ok    ok    ok    ok    ok    ok    ok    ok    ok    ok    ok

UPDATE  |  child: PK only       |  max_connections=20
                 16 │    ok   ERR   ERR ...
                 32 │    ok    ok    ok    ok   ERR ...

UPDATE  |  child: PK + 1 index  |  max_connections=20
                 32 │    ok    ok    ok   ERR ...        (flips earlier than matrix 2)

INSERT  |  child: PK only       |  max_connections=5
                 64 │    ok    ok    ok    ok   ERR ...  (flips; never flips at conn=20)
```

## How to read it

The cluster keeps one shared lock table, sized roughly
`max_locks_per_transaction * (MaxBackends + max_prepared_transactions)`, and
every relation a transaction writes to takes a lock held until commit. So:

- **Threshold climbs with `max_locks_per_transaction`** — bigger table, more
  relations tolerated before `ERR`. Down each column the boundary moves down.
- **Threshold climbs with `max_connections`** — it feeds `MaxBackends`, so the
  conn=5 matrices (5, 6) fail much earlier than conn=20 (1, 2). (The instances
  zero out wal-senders / worker processes so `max_connections` dominates and its
  effect is visible.)
- **UPDATE fails far sooner than INSERT.** Measured: an `INSERT` locks ~1
  relation per child (just the heap; the FK check also locks the shared `parent`
  table and its index). An `UPDATE` locks the heap **and every index** on the
  row's table.
- **An extra index hurts UPDATE but not INSERT.** Matrices 1 and 3 (INSERT) are
  identical, because INSERT doesn't take relation locks on the child's indexes.
  Matrix 4 (UPDATE +1 index, ~1+2 locks/child) flips earlier than matrix 2
  (UPDATE, ~1+1 locks/child).

### Why `shared_buffers` is pinned low

The lock table can borrow spare shared memory ("slop"), so with default
`shared_buffers` it doesn't fail until far more locks than the formula suggests.
The instances set `shared_buffers=16MB` to shrink that slop and keep the
thresholds small and on-chart. (Even so, with a large `max_locks_per_transaction`
the INSERT rows can exceed the tested write range and stay all-`ok` — bump
`WRITE_COUNTS` if you want to push them to fail.)

## Design notes

- [src/main.rs](src/main.rs) connects to all eight instances, builds the child
  table families each needs (the conn=20 instances host both a PK-only and a
  PK+index family), then sweeps every (matrix, mlt, N) cell. Each probe runs the
  writes in a transaction it then **rolls back**, so the sweep persists nothing,
  reuses the same tables, and needs no cleanup.
- Setup creates tables in chunks (`CHUNK = 50`) because DDL takes strong locks;
  only the measured INSERT/UPDATE transaction holds all N locks at once.
- Tune `MLTS`, `WRITE_COUNTS`, and the matrix list in
  [src/main.rs](src/main.rs); the instances and ports live in
  [docker-compose.yml](docker-compose.yml).
- Homebrew's `libpq` is keg-only; [.cargo/config.toml](.cargo/config.toml) points
  `pq-sys` at it via `PQ_LIB_DIR`. Adjust on non-Homebrew/Linux setups.

## Full sample output

All six matrices from one `./run.sh` (flip points vary a little run to run):

```text
INSERT  |  child: PK only       |  max_connections=20
  max_locks_per_txn │   100   200   300   400   600   800  1000  1250  1500  1750  2000
  ──────────────────┼──────────────────────────────────────────────────────────────────
                 16 │    ok    ok    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR
                 32 │    ok    ok    ok    ok    ok    ok   ERR   ERR   ERR   ERR   ERR
                 48 │    ok    ok    ok    ok    ok    ok    ok    ok    ok    ok    ok
                 64 │    ok    ok    ok    ok    ok    ok    ok    ok    ok    ok    ok

UPDATE  |  child: PK only       |  max_connections=20
  max_locks_per_txn │   100   200   300   400   600   800  1000  1250  1500  1750  2000
  ──────────────────┼──────────────────────────────────────────────────────────────────
                 16 │    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR
                 32 │    ok    ok    ok    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR
                 48 │    ok    ok    ok    ok    ok    ok    ok   ERR   ERR   ERR   ERR
                 64 │    ok    ok    ok    ok    ok    ok    ok   ERR   ERR   ERR   ERR

INSERT  |  child: PK + 1 index  |  max_connections=20
  max_locks_per_txn │   100   200   300   400   600   800  1000  1250  1500  1750  2000
  ──────────────────┼──────────────────────────────────────────────────────────────────
                 16 │    ok    ok    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR
                 32 │    ok    ok    ok    ok    ok    ok   ERR   ERR   ERR   ERR   ERR
                 48 │    ok    ok    ok    ok    ok    ok    ok    ok    ok    ok    ok
                 64 │    ok    ok    ok    ok    ok    ok    ok    ok    ok    ok    ok

UPDATE  |  child: PK + 1 index  |  max_connections=20
  max_locks_per_txn │   100   200   300   400   600   800  1000  1250  1500  1750  2000
  ──────────────────┼──────────────────────────────────────────────────────────────────
                 16 │    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR
                 32 │    ok    ok    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR
                 48 │    ok    ok    ok    ok    ok   ERR   ERR   ERR   ERR   ERR   ERR
                 64 │    ok    ok    ok    ok    ok   ERR   ERR   ERR   ERR   ERR   ERR

INSERT  |  child: PK only       |  max_connections=5
  max_locks_per_txn │   100   200   300   400   600   800  1000  1250  1500  1750  2000
  ──────────────────┼──────────────────────────────────────────────────────────────────
                 16 │    ok    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR
                 32 │    ok    ok    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR
                 48 │    ok    ok    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR
                 64 │    ok    ok    ok    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR

UPDATE  |  child: PK only       |  max_connections=5
  max_locks_per_txn │   100   200   300   400   600   800  1000  1250  1500  1750  2000
  ──────────────────┼──────────────────────────────────────────────────────────────────
                 16 │    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR
                 32 │    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR
                 48 │    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR
                 64 │    ok    ok   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR   ERR

ok = transaction succeeded (rolled back)   ERR = out of shared memory
- Threshold climbs with max_locks_per_transaction and with max_connections
  (both enlarge the shared lock table).
- UPDATE fails far sooner than INSERT, and an extra index hurts UPDATE but
  not INSERT: INSERT locks ~1 relation per child, UPDATE locks the heap +
  every index (~1 + #indexes).
```
