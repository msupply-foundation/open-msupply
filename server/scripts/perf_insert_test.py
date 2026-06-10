#!/usr/bin/env python3
"""Insert / delete / index-build perf for the properties KDD prototype.

Companion to `perf_sql_test.py` (which measures filter+sort read latency).
For each `(backend, method, N)` runs a 6-step lifecycle on dedicated
per-method per-size tables — separate from the read-perf tables, so this
script can run against the same DB file without disturbing read data:

    1. insert_cold        — empty unindexed table, bulk INSERT N records
    2. create_index_cold  — CREATE INDEX over those N rows. The headline
                            "add a new indexed property to a 100M-row
                             invoice_line table" measurement: scan +
                            sort every existing row.
    3. delete_indexed     — DELETE all rows with the extra index present
    4. insert_indexed     — empty-but-indexed table, bulk INSERT N records
    5. drop_index
    6. delete_unindexed   — DELETE all rows, no extra index

Methods:
    legacy        text JSON in `properties` column (one row per record)
    legacyJsonb   binary JSONB in `properties_jsonb` (one row per record)
    v2            1 name row + 4 property_v2_value rows per record
                  (full fan-out, matches the dense seed shape)

Per-method, per-size tables (independent — no cross-contamination):
    legacy:      perf_ins_legacy_<N>    (id, properties TEXT)
    legacyJsonb: perf_ins_jsonb_<N>     (id, properties_jsonb)
    v2:          perf_ins_v2_name_<N>   (id)
                 perf_ins_v2_value_<N>  (full pv2_value shape +
                                         app-baseline indexes)

Baseline-state note: v2 carries the three app-level indexes the OMS
schema ships with (lookup / property_id / record) since prod always has
them — so `insert_cold` for v2 is "on top of prod baseline", not "bare
table". Adding the value-type composite is an *extra* index on top.

Usage:
    python3 server/scripts/perf_insert_test.py \\
        --sqlite /tmp/perf-insert.sqlite \\
        --sizes 1000,10000,100000,300000,1000000

    python3 server/scripts/perf_insert_test.py \\
        --postgres "postgresql://postgres@localhost/perf_insert" \\
        --sizes 1000,10000,100000 \\
        --csv-out /tmp/perf_insert.csv

Output: per-(backend,size,method,op) row in CSV; stdout summary table.
"""

import argparse
import csv
import os
import signal
import sqlite3
import subprocess
import sys
import time
from typing import Callable, Dict, List, Optional, Tuple


# Reuse the SIGINT handler + psql runner from the read-perf script.
from perf_sql_test import (
    install_sigint_handler,
    make_psql_runner,
    exec_sqlite_ddl,
    exec_postgres_ddl,
)


METHODS = ["legacy", "legacyJsonb", "v2"]
OPS = [
    "insert_cold",
    "create_index_cold",
    "delete_indexed",
    "insert_indexed",
    "drop_index",
    "delete_unindexed",
]


# -- Table layout -----------------------------------------------------------


def table_names(method: str, size: int) -> Dict[str, str]:
    """Per-method, per-size table names. v2 returns two — name + value."""
    if method == "legacy":
        return {"name": f"perf_ins_legacy_{size}"}
    if method == "legacyJsonb":
        return {"name": f"perf_ins_jsonb_{size}"}
    if method == "v2":
        return {
            "name":  f"perf_ins_v2_name_{size}",
            "value": f"perf_ins_v2_value_{size}",
        }
    raise ValueError(f"unknown method: {method}")


def index_name(method: str, size: int) -> str:
    """Name of the extra index this lifecycle creates/drops. (v2 baseline
    indexes are separate — those persist across the lifecycle.)"""
    return {
        "legacy":      f"idx_perf_ins_legacy_count_{size}",
        "legacyJsonb": f"idx_perf_ins_jsonb_count_{size}",
        "v2":          f"idx_perf_ins_v2_value_num_{size}",
    }[method]


def drop_tables_sql(method: str, size: int) -> List[str]:
    t = table_names(method, size)
    stmts = [f"DROP TABLE IF EXISTS {t['name']}"]
    if "value" in t:
        # Drop value first — no FKs declared here, but the ordering matches
        # the conceptual parent/child shape.
        stmts.insert(0, f"DROP TABLE IF EXISTS {t['value']}")
    return stmts


def create_tables_sql(backend: str, method: str, size: int) -> List[str]:
    """Fresh CREATE for the per-method per-size tables. v2 also creates
    the three OMS-baseline pv2_value indexes so the "no extra index"
    state still reflects what prod actually carries."""
    t = table_names(method, size)
    jsonb_type = "JSONB" if backend == "postgres" else "TEXT"

    if method == "legacy":
        return [f"CREATE TABLE {t['name']} (id TEXT PRIMARY KEY, properties TEXT)"]
    if method == "legacyJsonb":
        return [f"CREATE TABLE {t['name']} (id TEXT PRIMARY KEY, properties_jsonb {jsonb_type})"]
    # v2
    return [
        f"CREATE TABLE {t['name']} (id TEXT PRIMARY KEY)",
        (
            f"CREATE TABLE {t['value']} ("
            f"id TEXT PRIMARY KEY, "
            f"table_name TEXT NOT NULL, "
            f"record_id TEXT NOT NULL, "
            f"property_id TEXT NOT NULL, "
            f"value_text TEXT, "
            f"value_number INTEGER, "
            f"value_real REAL, "
            f"value_date DATE, "
            f"value_option_id TEXT)"
        ),
        # Baseline app-level indexes shipped with the OMS schema. These
        # are part of the v2 prototype's prod cost and would already exist
        # before anyone added a new indexed property.
        f"CREATE INDEX idx_perf_ins_v2_value_lookup_{size} "
        f"ON {t['value']} (property_id, table_name, record_id)",
        f"CREATE INDEX idx_perf_ins_v2_value_property_id_{size} "
        f"ON {t['value']} (property_id)",
        f"CREATE INDEX idx_perf_ins_v2_value_record_{size} "
        f"ON {t['value']} (table_name, record_id)",
    ]


# -- INSERT SQL generators --------------------------------------------------
#
# Generative SQL — rows materialised in the DB via CTE / generate_series,
# never round-tripped through Python. Same shape as the dense seed so the
# data distribution matches the read-perf tests.

BEAN_NAMES_PG = "ARRAY['Black','Pinto','Navy','Kidney','Lima']"
BEAN_IDS_PG   = "ARRAY['perf_opt_bean_black','perf_opt_bean_pinto','perf_opt_bean_navy','perf_opt_bean_kidney','perf_opt_bean_lima']"


def insert_sql_postgres(method: str, size: int) -> str:
    t = table_names(method, size)
    if method == "legacy":
        return (
            f"INSERT INTO {t['name']} (id, properties) "
            f"SELECT "
            f"  'perf_ins_' || lpad(i::text, 7, '0'), "
            f"  '{{\"beans_thoughts\":\"thoughts on beans for store ' || i || '\","
            f"\"beans_count\":' || ((i*7) % 100) || ',"
            f"\"favourite_bean\":\"' || ({BEAN_NAMES_PG})[(i % 5) + 1] || '\","
            f"\"visit_date\":\"' || to_char(DATE '2025-01-01' + ((i-1) % 365), 'YYYY-MM-DD') || '\"}}' "
            f"FROM generate_series(1, {size}) AS s(i);"
        )
    if method == "legacyJsonb":
        return (
            f"INSERT INTO {t['name']} (id, properties_jsonb) "
            f"SELECT "
            f"  'perf_ins_' || lpad(i::text, 7, '0'), "
            f"  jsonb_build_object("
            f"    'beans_thoughts', 'thoughts on beans for store ' || i, "
            f"    'beans_count', (i*7) % 100, "
            f"    'favourite_bean', ({BEAN_NAMES_PG})[(i % 5) + 1], "
            f"    'visit_date', to_char(DATE '2025-01-01' + ((i-1) % 365), 'YYYY-MM-DD')"
            f"  ) "
            f"FROM generate_series(1, {size}) AS s(i);"
        )
    # v2: 1 name + 4 value inserts in a single multi-statement block.
    return (
        f"INSERT INTO {t['name']} (id) "
        f"SELECT 'perf_ins_' || lpad(i::text, 7, '0') "
        f"FROM generate_series(1, {size}) AS s(i); "

        f"INSERT INTO {t['value']} "
        f"(id, table_name, record_id, property_id, value_text) "
        f"SELECT "
        f"  'perf_pv2_thought_' || lpad(i::text, 7, '0'), 'name', "
        f"  'perf_ins_' || lpad(i::text, 7, '0'), 'perf_propv2_beans_thoughts', "
        f"  'thoughts on beans for store ' || i "
        f"FROM generate_series(1, {size}) AS s(i); "

        f"INSERT INTO {t['value']} "
        f"(id, table_name, record_id, property_id, value_number) "
        f"SELECT "
        f"  'perf_pv2_count_' || lpad(i::text, 7, '0'), 'name', "
        f"  'perf_ins_' || lpad(i::text, 7, '0'), 'perf_propv2_beans_count', "
        f"  (i*7) % 100 "
        f"FROM generate_series(1, {size}) AS s(i); "

        f"INSERT INTO {t['value']} "
        f"(id, table_name, record_id, property_id, value_option_id) "
        f"SELECT "
        f"  'perf_pv2_favbean_' || lpad(i::text, 7, '0'), 'name', "
        f"  'perf_ins_' || lpad(i::text, 7, '0'), 'perf_propv2_favourite_bean', "
        f"  ({BEAN_IDS_PG})[(i % 5) + 1] "
        f"FROM generate_series(1, {size}) AS s(i); "

        f"INSERT INTO {t['value']} "
        f"(id, table_name, record_id, property_id, value_date) "
        f"SELECT "
        f"  'perf_pv2_visitdate_' || lpad(i::text, 7, '0'), 'name', "
        f"  'perf_ins_' || lpad(i::text, 7, '0'), 'perf_propv2_visit_date', "
        f"  DATE '2025-01-01' + ((i-1) % 365) "
        f"FROM generate_series(1, {size}) AS s(i);"
    )


def insert_sql_sqlite(method: str, size: int) -> str:
    """SQLite version — same shape but using WITH RECURSIVE seq + CASE."""
    t = table_names(method, size)
    # Shared sequence CTE — N stays inside the WITH so we don't have to
    # re-emit it five times for v2.
    bean_names_case = (
        "CASE (i % 5) "
        "WHEN 0 THEN 'Black' WHEN 1 THEN 'Pinto' WHEN 2 THEN 'Navy' "
        "WHEN 3 THEN 'Kidney' ELSE 'Lima' END"
    )
    bean_ids_case = (
        "CASE (i % 5) "
        "WHEN 0 THEN 'perf_opt_bean_black' WHEN 1 THEN 'perf_opt_bean_pinto' "
        "WHEN 2 THEN 'perf_opt_bean_navy' WHEN 3 THEN 'perf_opt_bean_kidney' "
        "ELSE 'perf_opt_bean_lima' END"
    )
    seq_cte = (
        f"WITH RECURSIVE seq(i) AS ("
        f"SELECT 1 UNION ALL SELECT i + 1 FROM seq WHERE i < {size}"
        f") "
    )
    if method == "legacy":
        return (
            seq_cte +
            f"INSERT INTO {t['name']} (id, properties) "
            f"SELECT "
            f"  printf('perf_ins_%07d', i), "
            f"  '{{\"beans_thoughts\":\"thoughts on beans for store ' || i || '\","
            f"\"beans_count\":' || ((i*7) % 100) || ',"
            f"\"favourite_bean\":\"' || {bean_names_case} || '\","
            f"\"visit_date\":\"' || strftime('%Y-%m-%d', DATE('2025-01-01', '+' || ((i-1) % 365) || ' days')) || '\"}}' "
            f"FROM seq;"
        )
    if method == "legacyJsonb":
        # SQLite's properties_jsonb column is TEXT in standalone — same
        # serialisation as legacy; the column choice is what differs.
        return (
            seq_cte +
            f"INSERT INTO {t['name']} (id, properties_jsonb) "
            f"SELECT "
            f"  printf('perf_ins_%07d', i), "
            f"  '{{\"beans_thoughts\":\"thoughts on beans for store ' || i || '\","
            f"\"beans_count\":' || ((i*7) % 100) || ',"
            f"\"favourite_bean\":\"' || {bean_names_case} || '\","
            f"\"visit_date\":\"' || strftime('%Y-%m-%d', DATE('2025-01-01', '+' || ((i-1) % 365) || ' days')) || '\"}}' "
            f"FROM seq;"
        )
    # v2 — multi-statement, each with its own seq CTE since SQLite doesn't
    # share CTEs across statements in executescript.
    return (
        seq_cte +
        f"INSERT INTO {t['name']} (id) "
        f"SELECT printf('perf_ins_%07d', i) FROM seq; "

        + seq_cte +
        f"INSERT INTO {t['value']} "
        f"(id, table_name, record_id, property_id, value_text) "
        f"SELECT "
        f"  printf('perf_pv2_thought_%07d', i), 'name', "
        f"  printf('perf_ins_%07d', i), 'perf_propv2_beans_thoughts', "
        f"  'thoughts on beans for store ' || i "
        f"FROM seq; "

        + seq_cte +
        f"INSERT INTO {t['value']} "
        f"(id, table_name, record_id, property_id, value_number) "
        f"SELECT "
        f"  printf('perf_pv2_count_%07d', i), 'name', "
        f"  printf('perf_ins_%07d', i), 'perf_propv2_beans_count', "
        f"  (i*7) % 100 "
        f"FROM seq; "

        + seq_cte +
        f"INSERT INTO {t['value']} "
        f"(id, table_name, record_id, property_id, value_option_id) "
        f"SELECT "
        f"  printf('perf_pv2_favbean_%07d', i), 'name', "
        f"  printf('perf_ins_%07d', i), 'perf_propv2_favourite_bean', "
        f"  {bean_ids_case} "
        f"FROM seq; "

        + seq_cte +
        f"INSERT INTO {t['value']} "
        f"(id, table_name, record_id, property_id, value_date) "
        f"SELECT "
        f"  printf('perf_pv2_visitdate_%07d', i), 'name', "
        f"  printf('perf_ins_%07d', i), 'perf_propv2_visit_date', "
        f"  DATE('2025-01-01', '+' || ((i-1) % 365) || ' days') "
        f"FROM seq;"
    )


# -- DELETE SQL -------------------------------------------------------------


def delete_sql(method: str, size: int) -> str:
    t = table_names(method, size)
    if method == "v2":
        return f"DELETE FROM {t['value']}; DELETE FROM {t['name']};"
    return f"DELETE FROM {t['name']};"


# -- CREATE/DROP INDEX (the "extra" index this lifecycle measures) ----------


def create_index_sql(backend: str, method: str, size: int) -> str:
    idx = index_name(method, size)
    t = table_names(method, size)
    if method == "legacy":
        if backend == "postgres":
            return f"CREATE INDEX {idx} ON {t['name']} (((properties::jsonb) ->> 'beans_count'));"
        return f"CREATE INDEX {idx} ON {t['name']} (json_extract(properties, '$.beans_count'));"
    if method == "legacyJsonb":
        if backend == "postgres":
            return f"CREATE INDEX {idx} ON {t['name']} ((properties_jsonb ->> 'beans_count'));"
        return f"CREATE INDEX {idx} ON {t['name']} (json_extract(properties_jsonb, '$.beans_count'));"
    # v2: composite (table_name, property_id, value_number).
    return f"CREATE INDEX {idx} ON {t['value']} (table_name, property_id, value_number);"


def drop_index_sql(method: str, size: int) -> str:
    idx = index_name(method, size)
    return f"DROP INDEX IF EXISTS {idx};"


# -- Backend abstraction ----------------------------------------------------
#
# A tiny adapter so the lifecycle runner doesn't branch on backend at every
# step. `run_sql(sql)` executes one (possibly multi-statement) SQL block on
# the backend's persistent connection; returns wall-clock ms.

_active_sqlite_conn: Optional[sqlite3.Connection] = None


def _open_sqlite(db_path: str) -> sqlite3.Connection:
    global _active_sqlite_conn
    conn = sqlite3.connect(db_path, isolation_level=None)
    # WAL + larger cache + memory temp store: standard knobs for bulk
    # insert perf. Without WAL the journal fsyncs dominate.
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA cache_size=-200000;")  # 200 MB
    conn.execute("PRAGMA temp_store=MEMORY;")
    _active_sqlite_conn = conn
    return conn


def _close_sqlite(conn: sqlite3.Connection) -> None:
    global _active_sqlite_conn
    _active_sqlite_conn = None
    conn.close()


def make_run_sql(backend: str, target: str) -> Tuple[Callable[[str], float], Callable[[], None]]:
    """Returns `(run_sql, close)`. `run_sql(sql)` executes the (potentially
    multi-statement) block and returns elapsed ms."""
    if backend == "sqlite":
        conn = _open_sqlite(target)

        def run(sql: str) -> float:
            t0 = time.perf_counter()
            # executescript handles `;`-separated multi-statement bodies.
            # Wrap in a transaction explicitly — SQLite implicitly starts
            # one on the first statement and commits at executescript end,
            # but being explicit makes the timing scope obvious.
            conn.executescript("BEGIN; " + sql + " COMMIT;")
            return (time.perf_counter() - t0) * 1000.0

        return run, lambda: _close_sqlite(conn)

    # Postgres — reuse the persistent psql runner; it streams over stdin
    # so we don't pay process-spawn cost per op. We wrap each step in
    # BEGIN/COMMIT so timing covers the same transactional scope as
    # SQLite.
    make_runner, close_runner = make_psql_runner(target)

    def run(sql: str) -> float:
        once = make_runner("BEGIN; " + sql + " COMMIT;")
        t0 = time.perf_counter()
        once()
        return (time.perf_counter() - t0) * 1000.0

    return run, close_runner


# -- Lifecycle --------------------------------------------------------------


def run_lifecycle(
    backend: str, target: str, run_sql: Callable[[str], float],
    method: str, size: int,
) -> Dict[str, float]:
    """Drop+recreate per-method tables, then run the 6-step measured
    sequence. Returns `{op: elapsed_ms}` for every step."""

    insert_sql = (insert_sql_postgres if backend == "postgres"
                  else insert_sql_sqlite)(method, size)
    del_sql    = delete_sql(method, size)
    cidx_sql   = create_index_sql(backend, method, size)
    didx_sql   = drop_index_sql(method, size)

    # Setup (untimed): drop any pre-existing tables, create fresh ones
    # (v2 also creates app-baseline indexes here).
    ddl = exec_sqlite_ddl if backend == "sqlite" else exec_postgres_ddl
    for stmt in drop_tables_sql(method, size):
        ddl(target, stmt)
    for stmt in create_tables_sql(backend, method, size):
        ddl(target, stmt)

    results: Dict[str, float] = {}

    # 1) Bulk insert into empty unindexed (relative to the extra index) table.
    results["insert_cold"] = run_sql(insert_sql)

    # 2) Cold CREATE INDEX over those N rows. This is the headline op for
    #    "add a new indexed property to a 100M-row table" — full scan +
    #    sort + index build.
    results["create_index_cold"] = run_sql(cidx_sql)

    # 3) DELETE all rows with the extra index present.
    results["delete_indexed"] = run_sql(del_sql)

    # 4) Bulk insert into now-empty but indexed table. Compares to (1) —
    #    the delta is per-row index-maintenance cost.
    results["insert_indexed"] = run_sql(insert_sql)

    # 5) Drop the extra index. Usually quick, but worth measuring at large
    #    N (Postgres has to vacuum bitmap pages).
    results["drop_index"] = run_sql(didx_sql)

    # 6) DELETE all rows again, no extra index. Compares to (3).
    results["delete_unindexed"] = run_sql(del_sql)

    return results


# -- CSV --------------------------------------------------------------------

CSV_FIELDNAMES = ["backend", "size", "method", "op", "elapsed_ms"]


def _open_incremental_csv(path: str):
    """Append-only — re-running with the same path adds rows rather than
    overwriting. Delete the file first to start fresh."""
    needs_header = (not os.path.exists(path)) or os.path.getsize(path) == 0
    f = open(path, "a", newline="")
    w = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
    if needs_header:
        w.writeheader()
        f.flush()
    return f, w


def parse_sizes(s: str) -> List[int]:
    sizes = [int(x.strip()) for x in s.split(",") if x.strip()]
    if not sizes:
        raise argparse.ArgumentTypeError("at least one size required")
    if any(n <= 0 for n in sizes):
        raise argparse.ArgumentTypeError("sizes must be positive")
    return sizes


# -- Formatting / summary ---------------------------------------------------


def fmt(ms: float) -> str:
    if ms >= 10_000:
        return f"{ms/1000:6.1f}s "
    return f"{ms:6.0f}ms"


def print_summary(
    results: Dict[Tuple[str, int, str], Dict[str, float]],
    backends: List[str], sizes: List[int], methods: List[str],
) -> None:
    print()
    for backend in backends:
        print(f"== {backend} ==")
        # One table per op, rows = size, cols = method.
        for op in OPS:
            print(f"\n  {op}")
            header = f"  {'N':>10}" + "".join(f"{m:>14}" for m in methods)
            print(header)
            for size in sizes:
                row = f"  {size:>10,}"
                for m in methods:
                    cell = results.get((backend, size, m), {}).get(op)
                    row += f"{fmt(cell) if cell is not None else '—':>14}"
                print(row)
        print()


# -- Main -------------------------------------------------------------------


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("--sqlite",   help="Path to SQLite DB file (created if absent)")
    ap.add_argument("--postgres", help="Postgres conn string")
    ap.add_argument(
        "--sizes", type=parse_sizes,
        default=[1000, 10000, 100000, 300000, 1000000],
        help="Comma-separated record counts to test "
             "(default 1000,10000,100000,300000,1000000).",
    )
    ap.add_argument(
        "--methods", default=None,
        help="Comma-separated subset of methods (legacy,legacyJsonb,v2). "
             "Default: all three.",
    )
    ap.add_argument(
        "--csv-out", default="/tmp/perf_insert_test.csv",
        help="Append per-op rows to this CSV. Default /tmp/perf_insert_test.csv. "
             "Delete the file to start fresh.",
    )
    ap.add_argument(
        "--keep-tables", action="store_true",
        help="Don't drop the per-(method, size) tables after the lifecycle "
             "(useful for poking at the resulting state). Default: drop.",
    )
    args = ap.parse_args()

    if not args.sqlite and not args.postgres:
        ap.error("specify --sqlite and/or --postgres")

    methods = (
        [m.strip() for m in args.methods.split(",") if m.strip()]
        if args.methods else list(METHODS)
    )
    for m in methods:
        if m not in METHODS:
            ap.error(f"unknown method: {m} (valid: {','.join(METHODS)})")

    backends: List[Tuple[str, str]] = []
    if args.sqlite:
        backends.append(("sqlite", args.sqlite))
    if args.postgres:
        backends.append(("postgres", args.postgres))

    install_sigint_handler()

    print(f"Backends: {', '.join(b for b, _ in backends)}")
    print(f"Sizes:    {', '.join(f'{n:,}' for n in args.sizes)}")
    print(f"Methods:  {', '.join(methods)}")
    print(f"CSV:      {args.csv_out}")
    print()

    csv_file, csv_writer = _open_incremental_csv(args.csv_out)
    all_results: Dict[Tuple[str, int, str], Dict[str, float]] = {}

    try:
        for backend, target in backends:
            run_sql, close = make_run_sql(backend, target)
            try:
                for size in args.sizes:
                    for method in methods:
                        label = f"[{backend}] N={size:>8,}  {method:<12}"
                        print(f"{label} → running lifecycle …", flush=True)
                        try:
                            res = run_lifecycle(
                                backend, target, run_sql, method, size,
                            )
                        except Exception as e:
                            print(f"{label}   ERROR: {e}")
                            continue
                        all_results[(backend, size, method)] = res
                        for op in OPS:
                            ms = res[op]
                            print(f"{label}   {op:<20} {fmt(ms)}")
                            csv_writer.writerow({
                                "backend": backend, "size": size,
                                "method": method, "op": op,
                                "elapsed_ms": ms,
                            })
                        csv_file.flush()
                        if not args.keep_tables:
                            ddl = (exec_sqlite_ddl if backend == "sqlite"
                                   else exec_postgres_ddl)
                            for stmt in drop_tables_sql(method, size):
                                ddl(target, stmt)
                        print()
            finally:
                close()
    finally:
        csv_file.close()
        print(f"wrote CSV: {args.csv_out}")

    print_summary(
        all_results,
        backends=[b for b, _ in backends],
        sizes=args.sizes, methods=methods,
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
