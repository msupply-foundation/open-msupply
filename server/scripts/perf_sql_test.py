#!/usr/bin/env python3
"""Raw-SQL perf comparison for the properties KDD prototype.

Bypasses GraphQL/HTTP entirely and times queries directly against the
database. For each of the three storage strategies (legacy text JSON, legacy
JSONB twin, V2 relational) and each property type (text/number/option), runs
both a filter and a sort query, reports the median latency over N iterations.

Usage (SQLite):
    python3 server/scripts/perf_sql_test.py --sqlite server/omsupply-database.sqlite

Usage (Postgres):
    python3 server/scripts/perf_sql_test.py \\
        --postgres "postgresql://user:pass@localhost/omsupply"

Options:
    --iterations N   How many timed samples per query (default 10, plus one
                     warmup which is discarded).
    --limit N        LIMIT applied to query (default 50, matches the page
                     size the stores list requests).

Postgres uses `EXPLAIN (ANALYZE, BUFFERS)`-free execution: we time the wall
clock of `psql -c <sql>` round-trips. This includes a small constant of psql
process spawning but the comparison between methods is still valid.
"""

import argparse
import sqlite3
import statistics
import subprocess
import sys
import time
from typing import Callable, Tuple


# -- Query templates --------------------------------------------------------
#
# Each function returns a `(filter_sql, sort_sql)` pair for a (backend, field)
# combination. Filter queries always tack on `LIMIT N` so they mirror the
# paginated workload the stores list issues.

# Filter targets — same ones used by the k6/Node perf scripts:
#   text:   value LIKE '%store 7%'       → ~1111 matches
#   number: value BETWEEN 40 AND 60      → ~2100 matches
#   option: 'Navy' / perf_opt_bean_navy  → 2000 matches

TEXT_LIKE = "%store 7%"
NUM_MIN, NUM_MAX = 40, 60
OPTION_TEXT = "Navy"
OPTION_ID = "perf_opt_bean_navy"


SORT_SHAPE = "leftjoin"  # set in main(); 'leftjoin' or 'correlated'


def queries_sqlite(field: str, method: str, limit: int) -> Tuple[str, str]:
    if method in ("legacy", "legacyJsonb"):
        col = "properties_jsonb" if method == "legacyJsonb" else "properties"
        extract = f"json_extract(name.{col}, '$.{ {'text':'beans_thoughts','number':'beans_count','option':'favourite_bean'}[field] }')"
        if field == "text":
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE {extract} LIKE '{TEXT_LIKE}' LIMIT {limit})"
            )
        elif field == "number":
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE CAST({extract} AS INTEGER) BETWEEN {NUM_MIN} AND {NUM_MAX} "
                f"LIMIT {limit})"
            )
        else:  # option
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE {extract} = '{OPTION_TEXT}' LIMIT {limit})"
            )
        s_sql = (
            f"SELECT count(*) FROM (SELECT name.id FROM name "
            f"ORDER BY {extract} LIMIT {limit})"
        )
        return f_sql, s_sql
    # V2 path: relational query on property_v2_value
    prop_id = {
        "text": "perf_propv2_beans_thoughts",
        "number": "perf_propv2_beans_count",
        "option": "perf_propv2_favourite_bean",
    }[field]
    if field == "text":
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop_id}' AND pv.value_text LIKE '{TEXT_LIKE}' "
            f"LIMIT {limit})"
        )
        order_left_join = "pv.value_text"
        # Sub-select for the correlated form (uses the JOINed `pv` row).
        order_correlated = (
            f"(SELECT pv.value_text FROM property_v2_value pv "
            f"WHERE pv.record_id = n.id AND pv.table_name = 'name' "
            f"AND pv.property_id = '{prop_id}')"
        )
    elif field == "number":
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop_id}' "
            f"AND pv.value_number BETWEEN {NUM_MIN} AND {NUM_MAX} LIMIT {limit})"
        )
        order_left_join = "pv.value_number"
        order_correlated = (
            f"(SELECT pv.value_number FROM property_v2_value pv "
            f"WHERE pv.record_id = n.id AND pv.table_name = 'name' "
            f"AND pv.property_id = '{prop_id}')"
        )
    else:  # option
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop_id}' "
            f"AND pv.value_option_id = '{OPTION_ID}' LIMIT {limit})"
        )
        order_left_join = (
            "(SELECT pvo.name FROM property_v2_option pvo "
            "WHERE pvo.id = pv.value_option_id)"
        )
        order_correlated = (
            f"(SELECT pvo.name FROM property_v2_option pvo "
            f"WHERE pvo.id = (SELECT pv.value_option_id FROM property_v2_value pv "
            f"WHERE pv.record_id = n.id AND pv.table_name = 'name' "
            f"AND pv.property_id = '{prop_id}'))"
        )
    if SORT_SHAPE == "correlated":
        # Mirrors the server's `apply_property_v2_sort`: no JOIN, ORDER BY uses
        # a correlated subquery that re-fires once per outer row.
        s_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"ORDER BY {order_correlated} LIMIT {limit}) t"
        )
    else:
        s_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"LEFT JOIN property_v2_value pv ON pv.record_id = n.id "
            f"AND pv.table_name = 'name' AND pv.property_id = '{prop_id}' "
            f"ORDER BY {order_left_join} LIMIT {limit}) t"
        )
    return f_sql, s_sql


def queries_postgres(field: str, method: str, limit: int) -> Tuple[str, str]:
    if method in ("legacy", "legacyJsonb"):
        key = {"text": "beans_thoughts", "number": "beans_count", "option": "favourite_bean"}[field]
        if method == "legacyJsonb":
            extract = f"(name.properties_jsonb ->> '{key}')"
        else:
            extract = f"((name.properties::jsonb) ->> '{key}')"
        if field == "text":
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE {extract} ILIKE '{TEXT_LIKE}' LIMIT {limit}) t"
            )
        elif field == "number":
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE {extract}::integer BETWEEN {NUM_MIN} AND {NUM_MAX} "
                f"LIMIT {limit}) t"
            )
        else:
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE {extract} = '{OPTION_TEXT}' LIMIT {limit}) t"
            )
        s_sql = (
            f"SELECT count(*) FROM (SELECT name.id FROM name "
            f"ORDER BY {extract} LIMIT {limit}) t"
        )
        return f_sql, s_sql
    prop_id = {
        "text": "perf_propv2_beans_thoughts",
        "number": "perf_propv2_beans_count",
        "option": "perf_propv2_favourite_bean",
    }[field]
    if field == "text":
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop_id}' AND pv.value_text ILIKE '{TEXT_LIKE}' "
            f"LIMIT {limit}) t"
        )
        order = "pv.value_text"
    elif field == "number":
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop_id}' "
            f"AND pv.value_number BETWEEN {NUM_MIN} AND {NUM_MAX} LIMIT {limit}) t"
        )
        order = "pv.value_number"
    else:
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop_id}' "
            f"AND pv.value_option_id = '{OPTION_ID}' LIMIT {limit}) t"
        )
        order = (
            "(SELECT pvo.name FROM property_v2_option pvo "
            "WHERE pvo.id = pv.value_option_id)"
        )
    if SORT_SHAPE == "correlated":
        if field == "text":
            order_pg = (
                f"(SELECT pv.value_text FROM property_v2_value pv "
                f"WHERE pv.record_id = n.id AND pv.table_name = 'name' "
                f"AND pv.property_id = '{prop_id}')"
            )
        elif field == "number":
            order_pg = (
                f"(SELECT pv.value_number FROM property_v2_value pv "
                f"WHERE pv.record_id = n.id AND pv.table_name = 'name' "
                f"AND pv.property_id = '{prop_id}')"
            )
        else:
            order_pg = (
                f"(SELECT pvo.name FROM property_v2_option pvo "
                f"WHERE pvo.id = (SELECT pv.value_option_id "
                f"FROM property_v2_value pv WHERE pv.record_id = n.id "
                f"AND pv.table_name = 'name' AND pv.property_id = '{prop_id}'))"
            )
        s_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"ORDER BY {order_pg} LIMIT {limit}) t"
        )
    else:
        s_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"LEFT JOIN property_v2_value pv ON pv.record_id = n.id "
            f"AND pv.table_name = 'name' AND pv.property_id = '{prop_id}' "
            f"ORDER BY {order} LIMIT {limit}) t"
        )
    return f_sql, s_sql


# -- Runners ----------------------------------------------------------------


def time_query(run_once: Callable[[], None], iterations: int) -> Tuple[float, float, int]:
    """Returns (median_ms, p95_ms, samples_count). Discards one warmup."""
    run_once()  # warmup
    samples = []
    for _ in range(iterations):
        start = time.perf_counter()
        run_once()
        samples.append((time.perf_counter() - start) * 1000.0)
    samples.sort()
    median = statistics.median(samples)
    # p95 with linear interpolation on small samples
    p95_idx = max(0, int(round(0.95 * (len(samples) - 1))))
    p95 = samples[p95_idx]
    return median, p95, len(samples)


def make_sqlite_runner(db_path: str) -> Callable[[str], Callable[[], None]]:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL;")
    def runner(sql: str) -> Callable[[], None]:
        # Use a fresh cursor per call so the per-query timing isn't polluted
        # by reuse-time side effects.
        def run():
            cur = conn.cursor()
            cur.execute(sql)
            cur.fetchall()
            cur.close()
        return run
    return runner


def make_psql_runner(conn_str: str) -> Callable[[str], Callable[[], None]]:
    """Persistent `psql` subprocess — queries flow over its stdin so we don't
    pay process-start + new-connection cost on every iteration (which was
    ~100ms each before, dominating the actual query latency)."""
    proc = subprocess.Popen(
        [
            "psql", conn_str,
            "-A", "-t", "-q",       # unaligned, tuples-only, quiet
            "-X",                    # don't read ~/.psqlrc
            "-v", "ON_ERROR_STOP=1",
        ],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=1,
        text=True,
    )
    SENTINEL = "__PERF_DONE__"

    def runner(sql: str) -> Callable[[], None]:
        def run():
            if proc.poll() is not None:
                err = proc.stderr.read() if proc.stderr else ""
                raise RuntimeError(f"psql exited {proc.returncode}: {err[:400]}")
            # `\echo` writes the sentinel to stdout once the prior query
            # has finished — that's our signal to stop reading.
            proc.stdin.write(f"{sql};\n\\echo {SENTINEL}\n")
            proc.stdin.flush()
            while True:
                line = proc.stdout.readline()
                if not line:
                    err = proc.stderr.read() if proc.stderr else ""
                    raise RuntimeError(f"psql closed stdout: {err[:400]}")
                if line.strip() == SENTINEL:
                    return
        return run
    return runner


# -- Main -------------------------------------------------------------------


def fmt(ms: float) -> str:
    return f"{ms:6.1f}ms"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--sqlite", help="Path to SQLite DB file")
    ap.add_argument("--postgres", help="Postgres conn string (URL or psql args)")
    ap.add_argument("--iterations", type=int, default=10)
    ap.add_argument("--limit", type=int, default=50)
    ap.add_argument(
        "--sort-shape",
        choices=["leftjoin", "correlated"],
        default="leftjoin",
        help="V2 sort SQL pattern. 'correlated' mirrors the server's "
        "current `apply_property_v2_sort` (correlated subquery in ORDER BY); "
        "'leftjoin' is the rewrite that pre-joins the lookup row.",
    )
    args = ap.parse_args()
    global SORT_SHAPE
    SORT_SHAPE = args.sort_shape
    if not args.sqlite and not args.postgres:
        ap.error("specify --sqlite or --postgres")
    if args.sqlite and args.postgres:
        ap.error("specify only one of --sqlite / --postgres")

    if args.sqlite:
        backend = "sqlite"
        make_runner = make_sqlite_runner(args.sqlite)
        gen_queries = queries_sqlite
    else:
        backend = "postgres"
        make_runner = make_psql_runner(args.postgres)
        gen_queries = queries_postgres

    methods = ["legacy", "legacyJsonb", "v2"]
    fields = ["text", "number", "option"]

    print(f"Backend:    {backend}")
    print(f"Iterations: {args.iterations} (+1 warmup)   LIMIT: {args.limit}")
    print(f"V2 sort:    {SORT_SHAPE}")
    print()

    results = {"filter": {}, "sort": {}}
    for field in fields:
        results["filter"][field] = {}
        results["sort"][field] = {}
        for method in methods:
            f_sql, s_sql = gen_queries(field, method, args.limit)
            for op, sql in (("filter", f_sql), ("sort", s_sql)):
                label = f"{op:6} {field:6} {method:11}"
                try:
                    med, p95, _ = time_query(make_runner(sql), args.iterations)
                    results[op][field][method] = (med, p95)
                    print(f"{label} ... median {fmt(med)}  p95 {fmt(p95)}")
                except Exception as e:
                    results[op][field][method] = None
                    print(f"{label} ... ERROR: {e}")

    # Summary tables
    print()
    for op in ("filter", "sort"):
        print(f"== {op.upper()} median latency ({backend}) ==")
        print(f"{'field':<8}{'legacy':>11}{'jsonb':>11}{'v2':>11}")
        for field in fields:
            row = results[op][field]
            cells = []
            for method in methods:
                cell = row.get(method)
                cells.append(fmt(cell[0]) if cell else "    —")
            print(f"{field:<8}{cells[0]:>11}{cells[1]:>11}{cells[2]:>11}")
        print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
