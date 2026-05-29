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
import os
import signal
import sqlite3
import statistics
import subprocess
import sys
import time
from typing import Callable, List, Optional, Tuple


SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))


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
# 7-day window inside the 365-day visit_date spread → ~1.9% of seeded stores.
DATE_FROM = "2025-02-01"
DATE_TO = "2025-02-07"

# Sparse fields target one representative property each from
# seed_perf_sparse_properties.{sqlite,postgres}.sql. Picked at mid density
# (~36–51% fill rate) so the workload differs from the always-populated
# dense fields. Only included if sparse data is present in the DB.
SPARSE_FIELDS = ["text_sparse", "number_sparse", "option_sparse", "date_sparse"]
SPARSE_LEGACY_KEY = {
    "text_sparse":   "sparse_text_09",   # density ~51%
    "number_sparse": "sparse_num_04",    # density ~46%
    "option_sparse": "sparse_opt_04",    # density ~36%
    "date_sparse":   "sparse_date_05",   # density ~48%
}
SPARSE_V2_PROP_ID = {
    "text_sparse":   "perf_sparse_propv2_text_09",
    "number_sparse": "perf_sparse_propv2_num_04",
    "option_sparse": "perf_sparse_propv2_opt_04",
    "date_sparse":   "perf_sparse_propv2_date_05",
}
# Sparse text values are formatted "sparse value s<idx> p<prop_idx>" — match
# stores whose idx contains "77" (~1111 stores * 51% pop ≈ 566 matches).
SPARSE_TEXT_LIKE = "%s77%"
# V2 option filter targets the option id; legacy filter targets the display
# name, since the sparse seed merges the option's `name` (matching the dense
# seed's "favourite_bean":"Pinto" convention) into name.properties.
SPARSE_OPTION_ID = "perf_sparse_propv2_opt_04_opt_2"
SPARSE_OPTION_TEXT = "Opt 2"


def base_field(field: str) -> str:
    """'text' / 'text_sparse' → 'text'."""
    return field[: -len("_sparse")] if field.endswith("_sparse") else field


def is_sparse(field: str) -> bool:
    return field.endswith("_sparse")


# -- Nested JSON cases ------------------------------------------------------
#
# The dense seed plants a deeply-nested object under `name.properties` with
# junk sibling keys at every level so the JSON parser has real work to do
# before reaching the target. V2 has no notion of nested values, so these
# cases only target the legacy + legacy-JSONB paths.
#
# A single dense case is enough — sparse density wouldn't change the legacy
# cost (every row's blob is parsed regardless of whether the target key is
# present), and additional depth variants would just duplicate the signal.
NESTED_FIELDS_DENSE = ["nested_city"]
NESTED_FIELDS_SPARSE: List[str] = []  # reserved — no sparse nested cases today
NESTED_DEF = {
    # field: (path_segments, equality_filter_value)
    "nested_city": (["metadata", "location", "address", "primary", "city"], "City 7"),
}


def is_nested(field: str) -> bool:
    return field in NESTED_DEF


def applicable_methods(field: str) -> List[str]:
    """V2 doesn't model nested values — skip it for nested cases so the
    summary shows a clean '—' rather than spurious 'ERROR' rows."""
    if is_nested(field):
        return ["legacy", "legacyJsonb"]
    return ["legacy", "legacyJsonb", "v2"]


# -- Indexed "best case" pass -----------------------------------------------
#
# Functional indexes over JSONB-extracted values turn what would be a full
# blob-parsing scan into an index seek (filter) and an in-order traversal
# (sort). To keep the comparison honest we create the index *after* the
# regular matrix runs, time the same legacyJsonb queries against the
# indexed column, then drop it again — so the un-indexed numbers in the
# main matrix aren't accidentally accelerated by a leftover index.
#
# Scoped via partial indexes (`WHERE id LIKE 'perf_store_%'`) so we don't
# touch real data on shared dev DBs.
# Each backend gets a list of (index_name, expression) pairs. The list shape
# allows multiple indexes per case (e.g. when filter and sort use different
# expressions), but the date case only needs one TEXT index now that both
# filter and sort compare as TEXT (ISO-8601 sorts lexicographically the same
# as chronologically, so no cast is needed and no IMMUTABLE-wrapper dance
# is required for the index).
INDEXED_CASES = [
    {
        "field": "date",
        "sqlite_indexes": [
            (
                "idx_perf_visit_date_jsonb",
                "json_extract(properties_jsonb, '$.visit_date')",
            ),
        ],
        "postgres_indexes": [
            # Text extract — matches the filter `WHERE (extract) BETWEEN '…'`
            # and the sort `ORDER BY (extract)` (both use plain text compare).
            (
                "idx_perf_visit_date_jsonb",
                "(properties_jsonb ->> 'visit_date')",
            ),
        ],
    },
]


def exec_sqlite_ddl(db_path: str, sql: str) -> None:
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(sql)
        conn.commit()
    finally:
        conn.close()


def exec_postgres_ddl(conn_str: str, sql: str) -> None:
    # One-off psql so DDL is not piped through the persistent perf runner
    # (which is shaped for timed SELECTs, not setup). Surface stderr on
    # failure — `check=True, capture_output=True` swallows it otherwise,
    # leaving only "exit status N" which is useless for diagnosing e.g.
    # IMMUTABLE-function errors during CREATE INDEX.
    result = subprocess.run(
        ["psql", conn_str, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-c", sql],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"psql exited {result.returncode} running:\n  {sql}\n"
            f"--- stderr ---\n{result.stderr}"
        )


# -- Multi-statement SQL execution (seed scripts, cleanup blocks) -----------
#
# `exec_*_ddl` above is one-shot SQL via `-c`; for the multi-statement seed
# files we need a different shape (executescript on SQLite, `psql -f -` on
# Postgres). These are split out so callers can read+substitute+execute a
# seed file without writing a temp file.


def run_sql_sqlite(db_path: str, sql: str) -> None:
    """Execute multi-statement SQL against a SQLite file."""
    global _active_sqlite_conn
    conn = sqlite3.connect(db_path)
    _active_sqlite_conn = conn
    try:
        conn.executescript(sql)
        conn.commit()
    finally:
        _active_sqlite_conn = None
        conn.close()


def run_sql_postgres(conn_str: str, sql: str) -> None:
    """Execute multi-statement SQL against a Postgres DB via `psql -f -`."""
    result = subprocess.run(
        ["psql", conn_str, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", "-"],
        input=sql, text=True, capture_output=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"psql exited {result.returncode}\n"
            f"--- stderr ---\n{result.stderr}\n"
            f"--- stdout ---\n{result.stdout}"
        )


# -- Seed lifecycle (clean → seed dense → seed sparse) ----------------------
#
# Seeding helpers used by `perf_scale.py`'s sweep loop and (optionally) by
# `perf_sql_test.py` itself via the `--seed N` flag. Living here keeps the
# seed/cleanup logic in one place rather than duplicated across scripts.

SEED_DENSE_SQLITE    = "seed_perf_properties.sqlite.sql"
SEED_DENSE_POSTGRES  = "seed_perf_properties.postgres.sql"
SEED_SPARSE_SQLITE   = "seed_perf_sparse_properties.sqlite.sql"
SEED_SPARSE_POSTGRES = "seed_perf_sparse_properties.postgres.sql"


def load_seed_sql(filename: str, size: Optional[int]) -> str:
    """Read a seed SQL file from `SCRIPTS_DIR`, optionally substituting the
    store-count bound.

    `size=None` → load unchanged (sparse seed has no store-count bound).
    Dense seeds hard-code 100000; we swap that for the requested N in
    whichever pattern matches (`WHERE i < 100000` for SQLite,
    `generate_series(1, 100000)` for Postgres).
    """
    with open(os.path.join(SCRIPTS_DIR, filename), "r") as f:
        sql = f.read()
    if size is None:
        return sql
    sqlite_marker = "WHERE i < 100000"
    pg_marker = "generate_series(1, 100000)"
    if sqlite_marker in sql:
        return sql.replace(sqlite_marker, f"WHERE i < {size}")
    if pg_marker in sql:
        return sql.replace(pg_marker, f"generate_series(1, {size})")
    raise RuntimeError(
        f"size marker not found in {filename}; expected one of "
        f"{sqlite_marker!r} or {pg_marker!r}"
    )


# Cleanup block from server/scripts/README.md. Order matters on Postgres
# (FK enforcement); SQLite doesn't enforce FKs by default but the same order
# works.
CLEANUP_STATEMENTS: List[str] = [
    "DELETE FROM property_v2_value  WHERE record_id LIKE 'perf_store_%'",
    "DELETE FROM store              WHERE id LIKE 'perf_store_%'",
    "DELETE FROM name_link          WHERE name_id LIKE 'perf_store_%'",
    "DELETE FROM name               WHERE id LIKE 'perf_store_%'",
    "DELETE FROM property_v2_option WHERE property_id LIKE 'perf_propv2_%' OR property_id LIKE 'perf_sparse_propv2_%'",
    "DELETE FROM property_v2_table  WHERE property_id LIKE 'perf_propv2_%' OR property_id LIKE 'perf_sparse_propv2_%'",
    "DELETE FROM property_v2        WHERE id LIKE 'perf_propv2_%' OR id LIKE 'perf_sparse_propv2_%'",
    "DELETE FROM name_property      WHERE id LIKE 'perf_np_%' OR id LIKE 'perf_sparse_np_%'",
    "DELETE FROM property           WHERE id LIKE 'perf_prop_%' OR id LIKE 'perf_sparse_prop_%'",
]


def cleanup_sqlite(db_path: str) -> None:
    run_sql_sqlite(db_path, "BEGIN;\n" + ";\n".join(CLEANUP_STATEMENTS) + ";\nCOMMIT;\n")


def cleanup_postgres(conn_str: str) -> None:
    run_sql_postgres(conn_str, "BEGIN;\n" + ";\n".join(CLEANUP_STATEMENTS) + ";\nCOMMIT;\n")


def seed_lifecycle(
    backend: str, target: str, size: int, skip_sparse: bool = False,
) -> Tuple[float, float, float]:
    """Run cleanup → seed dense → (optionally) seed sparse for one size.

    Returns `(cleanup_ms, seed_dense_ms, seed_sparse_ms)`. Suitable for use
    inside a per-size sweep loop and for one-shot seeding via `--seed N`.
    """
    if backend == "sqlite":
        run_sql = run_sql_sqlite
        cleanup = cleanup_sqlite
        dense_file, sparse_file = SEED_DENSE_SQLITE, SEED_SPARSE_SQLITE
    else:
        run_sql = run_sql_postgres
        cleanup = cleanup_postgres
        dense_file, sparse_file = SEED_DENSE_POSTGRES, SEED_SPARSE_POSTGRES

    t0 = time.perf_counter()
    cleanup(target)
    cleanup_ms = (time.perf_counter() - t0) * 1000.0

    t0 = time.perf_counter()
    run_sql(target, load_seed_sql(dense_file, size))
    seed_dense_ms = (time.perf_counter() - t0) * 1000.0

    seed_sparse_ms = 0.0
    if not skip_sparse:
        t0 = time.perf_counter()
        run_sql(target, load_seed_sql(sparse_file, None))
        seed_sparse_ms = (time.perf_counter() - t0) * 1000.0

    return cleanup_ms, seed_dense_ms, seed_sparse_ms


# -- SIGINT handler for SQLite (interrupts the in-flight query) -------------
#
# SQLite's C extension holds the GIL during a long query, so a plain Ctrl-C
# stays queued until the call returns — useless if a query takes minutes.
# Track the active connection at module level and call `conn.interrupt()` in
# the signal handler; that yanks SQLite out of its scan with an
# `OperationalError`, control returns to Python, and the `KeyboardInterrupt`
# we raise here propagates normally.

_active_sqlite_conn: Optional[sqlite3.Connection] = None


def install_sigint_handler() -> None:
    """Idempotent; safe to call once at startup of any script that opens a
    SQLite connection through `make_sqlite_runner` or `run_sql_sqlite`."""
    def handler(signum, frame):
        if _active_sqlite_conn is not None:
            try:
                _active_sqlite_conn.interrupt()
            except Exception:
                pass
        raise KeyboardInterrupt()
    signal.signal(signal.SIGINT, handler)


SORT_SHAPE = "leftjoin"  # set in main(); 'leftjoin' or 'correlated'


def queries_sqlite(field: str, method: str, limit: int) -> Tuple[str, str]:
    # Nested fields short-circuit the per-type matrix: they only run on the
    # legacy paths and use a deep JSON path with sibling junk to traverse.
    if is_nested(field):
        col = "properties_jsonb" if method == "legacyJsonb" else "properties"
        segments, val = NESTED_DEF[field]
        path = "$." + ".".join(segments)
        extract = f"json_extract(name.{col}, '{path}')"
        f_sql = (
            f"SELECT count(*) FROM (SELECT name.id FROM name "
            f"WHERE {extract} = '{val}' LIMIT {limit})"
        )
        s_sql = (
            f"SELECT count(*) FROM (SELECT name.id FROM name "
            f"ORDER BY {extract} LIMIT {limit})"
        )
        return f_sql, s_sql

    bfield = base_field(field)
    sparse = is_sparse(field)
    text_like = SPARSE_TEXT_LIKE if sparse else TEXT_LIKE
    option_legacy = SPARSE_OPTION_TEXT if sparse else OPTION_TEXT
    option_v2 = SPARSE_OPTION_ID if sparse else OPTION_ID
    if method in ("legacy", "legacyJsonb"):
        col = "properties_jsonb" if method == "legacyJsonb" else "properties"
        key = (SPARSE_LEGACY_KEY if sparse else {
            "text": "beans_thoughts",
            "number": "beans_count",
            "option": "favourite_bean",
            "date": "visit_date",
        })[field]
        extract = f"json_extract(name.{col}, '$.{key}')"
        if bfield == "text":
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE {extract} LIKE '{text_like}' LIMIT {limit})"
            )
        elif bfield == "number":
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE CAST({extract} AS INTEGER) BETWEEN {NUM_MIN} AND {NUM_MAX} "
                f"LIMIT {limit})"
            )
        elif bfield == "date":
            # ISO-8601 dates sort & compare correctly as text in SQLite, so no
            # CAST is needed — matches what the legacy filter would do.
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE {extract} BETWEEN '{DATE_FROM}' AND '{DATE_TO}' "
                f"LIMIT {limit})"
            )
        else:  # option
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE {extract} = '{option_legacy}' LIMIT {limit})"
            )
        s_sql = (
            f"SELECT count(*) FROM (SELECT name.id FROM name "
            f"ORDER BY {extract} LIMIT {limit})"
        )
        return f_sql, s_sql
    # V2 path: relational query on property_v2_value
    prop_id = (SPARSE_V2_PROP_ID if sparse else {
        "text": "perf_propv2_beans_thoughts",
        "number": "perf_propv2_beans_count",
        "option": "perf_propv2_favourite_bean",
        "date": "perf_propv2_visit_date",
    })[field]
    if bfield == "text":
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop_id}' AND pv.value_text LIKE '{text_like}' "
            f"LIMIT {limit})"
        )
        order_left_join = "pv.value_text"
        # Sub-select for the correlated form (uses the JOINed `pv` row).
        order_correlated = (
            f"(SELECT pv.value_text FROM property_v2_value pv "
            f"WHERE pv.record_id = n.id AND pv.table_name = 'name' "
            f"AND pv.property_id = '{prop_id}')"
        )
    elif bfield == "number":
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
    elif bfield == "date":
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop_id}' "
            f"AND pv.value_date BETWEEN '{DATE_FROM}' AND '{DATE_TO}' LIMIT {limit})"
        )
        order_left_join = "pv.value_date"
        order_correlated = (
            f"(SELECT pv.value_date FROM property_v2_value pv "
            f"WHERE pv.record_id = n.id AND pv.table_name = 'name' "
            f"AND pv.property_id = '{prop_id}')"
        )
    else:  # option
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop_id}' "
            f"AND pv.value_option_id = '{option_v2}' LIMIT {limit})"
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
    # Nested fields short-circuit the per-type matrix: they only run on the
    # legacy paths via `#>>` (jsonb path-to-text extract) so the parser walks
    # the deep path including sibling junk at each level.
    if is_nested(field):
        segments, val = NESTED_DEF[field]
        path_brace = "{" + ",".join(segments) + "}"
        if method == "legacyJsonb":
            extract = f"(name.properties_jsonb #>> '{path_brace}')"
        else:
            extract = f"((name.properties::jsonb) #>> '{path_brace}')"
        f_sql = (
            f"SELECT count(*) FROM (SELECT name.id FROM name "
            f"WHERE {extract} = '{val}' LIMIT {limit}) t"
        )
        s_sql = (
            f"SELECT count(*) FROM (SELECT name.id FROM name "
            f"ORDER BY {extract} LIMIT {limit}) t"
        )
        return f_sql, s_sql

    bfield = base_field(field)
    sparse = is_sparse(field)
    text_like = SPARSE_TEXT_LIKE if sparse else TEXT_LIKE
    option_legacy = SPARSE_OPTION_TEXT if sparse else OPTION_TEXT
    option_v2 = SPARSE_OPTION_ID if sparse else OPTION_ID
    if method in ("legacy", "legacyJsonb"):
        key = (SPARSE_LEGACY_KEY if sparse else {
            "text": "beans_thoughts",
            "number": "beans_count",
            "option": "favourite_bean",
            "date": "visit_date",
        })[field]
        if method == "legacyJsonb":
            extract = f"(name.properties_jsonb ->> '{key}')"
        else:
            extract = f"((name.properties::jsonb) ->> '{key}')"
        if bfield == "text":
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE {extract} ILIKE '{text_like}' LIMIT {limit}) t"
            )
        elif bfield == "number":
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE {extract}::integer BETWEEN {NUM_MIN} AND {NUM_MAX} "
                f"LIMIT {limit}) t"
            )
        elif bfield == "date":
            # Compare as TEXT, not DATE — ISO-8601 ('YYYY-MM-DD') sorts
            # lexicographically the same as chronologically, so we get the
            # right answer without a cast. This also lets the indexed pass
            # use a single TEXT functional index for both filter and sort
            # (both `::date` and `to_date(…)` are STABLE in Postgres and
            # rejected by CREATE INDEX without an IMMUTABLE wrapper).
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE {extract} BETWEEN '{DATE_FROM}' AND '{DATE_TO}' "
                f"LIMIT {limit}) t"
            )
        else:
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE {extract} = '{option_legacy}' LIMIT {limit}) t"
            )
        s_sql = (
            f"SELECT count(*) FROM (SELECT name.id FROM name "
            f"ORDER BY {extract} LIMIT {limit}) t"
        )
        return f_sql, s_sql
    prop_id = (SPARSE_V2_PROP_ID if sparse else {
        "text": "perf_propv2_beans_thoughts",
        "number": "perf_propv2_beans_count",
        "option": "perf_propv2_favourite_bean",
        "date": "perf_propv2_visit_date",
    })[field]
    if bfield == "text":
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop_id}' AND pv.value_text ILIKE '{text_like}' "
            f"LIMIT {limit}) t"
        )
        order = "pv.value_text"
    elif bfield == "number":
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop_id}' "
            f"AND pv.value_number BETWEEN {NUM_MIN} AND {NUM_MAX} LIMIT {limit}) t"
        )
        order = "pv.value_number"
    elif bfield == "date":
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop_id}' "
            f"AND pv.value_date BETWEEN DATE '{DATE_FROM}' AND DATE '{DATE_TO}' "
            f"LIMIT {limit}) t"
        )
        order = "pv.value_date"
    else:
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop_id}' "
            f"AND pv.value_option_id = '{option_v2}' LIMIT {limit}) t"
        )
        order = (
            "(SELECT pvo.name FROM property_v2_option pvo "
            "WHERE pvo.id = pv.value_option_id)"
        )
    if SORT_SHAPE == "correlated":
        if bfield == "text":
            order_pg = (
                f"(SELECT pv.value_text FROM property_v2_value pv "
                f"WHERE pv.record_id = n.id AND pv.table_name = 'name' "
                f"AND pv.property_id = '{prop_id}')"
            )
        elif bfield == "number":
            order_pg = (
                f"(SELECT pv.value_number FROM property_v2_value pv "
                f"WHERE pv.record_id = n.id AND pv.table_name = 'name' "
                f"AND pv.property_id = '{prop_id}')"
            )
        elif bfield == "date":
            order_pg = (
                f"(SELECT pv.value_date FROM property_v2_value pv "
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


def time_query_budgeted(
    run_once: Callable[[], None],
    max_iterations: int,
    budget_ms: float,
) -> Tuple[float, float, int]:
    """Like `time_query` but with a soft wall-clock budget per case.

    At large N the legacy sort cases routinely cost multiple seconds per
    sample, so 11 fixed iterations burns a minute per case for not much
    extra signal. Instead: run the warmup, measure it, then run as many
    timed samples as fit within `budget_ms`, clamped to
    `[1, max_iterations]`. Fast cases still get the full sample count;
    slow cases gracefully degrade to one sample with `median == p95`.
    """
    t0 = time.perf_counter()
    run_once()  # warmup, discarded
    warmup_ms = (time.perf_counter() - t0) * 1000.0

    if warmup_ms <= 0:
        n = max_iterations
    else:
        n = max(1, min(max_iterations, int(budget_ms // warmup_ms)))

    samples = []
    for _ in range(n):
        start = time.perf_counter()
        run_once()
        samples.append((time.perf_counter() - start) * 1000.0)
    samples.sort()
    median = statistics.median(samples)
    p95_idx = max(0, int(round(0.95 * (len(samples) - 1))))
    p95 = samples[p95_idx]
    return median, p95, len(samples)


def make_sqlite_runner(
    db_path: str,
) -> Tuple[Callable[[str], Callable[[], None]], Callable[[], None]]:
    """Returns `(make_runner, close)`. `make_runner(sql)` returns a callable
    that executes `sql` once when called — used by `time_query` /
    `time_query_budgeted` to time repeated executions of the same statement.
    Registers the connection with the SIGINT handler so Ctrl-C during a long
    query actually interrupts SQLite."""
    global _active_sqlite_conn
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL;")
    _active_sqlite_conn = conn

    def runner(sql: str) -> Callable[[], None]:
        # Use a fresh cursor per call so the per-query timing isn't polluted
        # by reuse-time side effects.
        def run() -> None:
            cur = conn.cursor()
            cur.execute(sql)
            cur.fetchall()
            cur.close()
        return run

    def close() -> None:
        global _active_sqlite_conn
        _active_sqlite_conn = None
        conn.close()

    return runner, close


def has_sparse_sqlite(db_path: str) -> bool:
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.execute(
            "SELECT 1 FROM property_v2 WHERE id LIKE 'perf_sparse_propv2_%' LIMIT 1"
        )
        return cur.fetchone() is not None
    finally:
        conn.close()


def has_sparse_postgres(conn_str: str) -> bool:
    # One-off psql probe rather than reusing the persistent runner — the runner
    # discards output, and we need the row count here.
    result = subprocess.run(
        [
            "psql", conn_str, "-A", "-t", "-q", "-X",
            "-c", "SELECT COUNT(*) FROM property_v2 "
                  "WHERE id LIKE 'perf_sparse_propv2_%'",
        ],
        capture_output=True, text=True, check=True,
    )
    return int(result.stdout.strip() or "0") > 0


def make_psql_runner(
    conn_str: str,
) -> Tuple[Callable[[str], Callable[[], None]], Callable[[], None]]:
    """Persistent `psql` subprocess — queries flow over its stdin so we don't
    pay process-start + new-connection cost on every iteration (which was
    ~100ms each before, dominating the actual query latency).

    Returns `(make_runner, close)` for symmetry with `make_sqlite_runner`."""
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
        def run() -> None:
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

    def close() -> None:
        try:
            if proc.stdin:
                proc.stdin.close()
        except Exception:
            pass
        try:
            proc.wait(timeout=5)
        except Exception:
            pass

    return runner, close


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
    ap.add_argument(
        "--seed", type=int, metavar="N",
        help="Before running the matrix, cleanup + seed N stores. Without "
        "this flag the script runs against whatever's already in the DB "
        "(legacy behaviour).",
    )
    ap.add_argument(
        "--skip-sparse", action="store_true",
        help="When seeding via --seed, skip the 30 variably-sparse "
        "properties. Saves a lot of seed time at large N.",
    )
    ap.add_argument(
        "--per-case-budget-ms", type=float, default=None,
        help="Soft time budget per query case. When set, the timer runs "
        "`min(--iterations, floor(budget / warmup_ms))` samples (floored "
        "at 1) so slow cases gracefully degrade rather than running 11 "
        "multi-second samples. Default: unset (use fixed --iterations).",
    )
    args = ap.parse_args()
    global SORT_SHAPE
    SORT_SHAPE = args.sort_shape
    if not args.sqlite and not args.postgres:
        ap.error("specify --sqlite or --postgres")
    if args.sqlite and args.postgres:
        ap.error("specify only one of --sqlite / --postgres")

    install_sigint_handler()

    target = args.sqlite if args.sqlite else args.postgres
    backend = "sqlite" if args.sqlite else "postgres"

    if args.seed is not None:
        print(f"[{backend}] cleanup + seed N={args.seed:,} "
              f"(sparse {'skipped' if args.skip_sparse else 'included'}) …",
              flush=True)
        cleanup_ms, dense_ms, sparse_ms = seed_lifecycle(
            backend, target, args.seed, skip_sparse=args.skip_sparse,
        )
        print(f"[{backend}] cleanup={cleanup_ms/1000:.1f}s  "
              f"seed_dense={dense_ms/1000:.1f}s  "
              f"seed_sparse={sparse_ms/1000:.1f}s")

    if args.sqlite:
        make_runner, close_runner = make_sqlite_runner(args.sqlite)
        gen_queries = queries_sqlite
        sparse_seeded = has_sparse_sqlite(args.sqlite)
    else:
        make_runner, close_runner = make_psql_runner(args.postgres)
        gen_queries = queries_postgres
        sparse_seeded = has_sparse_postgres(args.postgres)

    def time_case(sql: str) -> Tuple[float, float, int]:
        if args.per_case_budget_ms is not None:
            return time_query_budgeted(
                make_runner(sql), args.iterations, args.per_case_budget_ms,
            )
        return time_query(make_runner(sql), args.iterations)

    methods = ["legacy", "legacyJsonb", "v2"]
    fields = ["text", "number", "option", "date"] + NESTED_FIELDS_DENSE
    if sparse_seeded:
        fields = fields + SPARSE_FIELDS + NESTED_FIELDS_SPARSE

    print(f"Backend:    {backend}")
    print(f"Iterations: {args.iterations} (+1 warmup)   LIMIT: {args.limit}")
    print(f"V2 sort:    {SORT_SHAPE}")
    print(f"Sparse:     {'present — *_sparse cases included' if sparse_seeded else 'not seeded — *_sparse cases skipped'}")
    print()

    results = {"filter": {}, "sort": {}}
    try:
      for field in fields:
        results["filter"][field] = {}
        results["sort"][field] = {}
        for method in applicable_methods(field):
            f_sql, s_sql = gen_queries(field, method, args.limit)
            for op, sql in (("filter", f_sql), ("sort", s_sql)):
                label = f"{op:6} {field:24} {method:11}"
                try:
                    med, p95, n = time_case(sql)
                    results[op][field][method] = (med, p95)
                    print(f"{label} ... median {fmt(med)}  p95 {fmt(p95)}  n={n}")
                except Exception as e:
                    results[op][field][method] = None
                    print(f"{label} ... ERROR: {e}")

      # Indexed pass: create a functional index over each configured JSONB
      # extract, re-time the legacyJsonb queries (the planner will pick up
      # the index automatically), record results under the "indexed" method,
      # then drop the index. Done AFTER the main matrix so leftover indexes
      # never accelerate the unindexed numbers above.
      print()
      print("== indexed pass (functional index on JSONB extracts) ==")
      for case in INDEXED_CASES:
        field = case["field"]
        if field not in results["filter"]:
            print(f"  skipping {field}: field not in matrix")
            continue
        indexes = case["sqlite_indexes" if backend == "sqlite" else "postgres_indexes"]
        # Full index, not partial: SQLite (and PG) only use a partial index
        # when the query includes a predicate matching the index's WHERE
        # clause. The matrix queries don't filter by id, so the partial
        # variant would be ignored and the indexed pass would look like a
        # null result. Full index covers the whole `name` table for the
        # duration of this case, then we drop it.
        if backend == "sqlite":
            for idx_name, expr in indexes:
                exec_sqlite_ddl(args.sqlite, f"CREATE INDEX IF NOT EXISTS {idx_name} ON name ({expr})")
            exec_sqlite_ddl(args.sqlite, "ANALYZE name")
        else:
            for idx_name, expr in indexes:
                exec_postgres_ddl(args.postgres, f"CREATE INDEX IF NOT EXISTS {idx_name} ON name ({expr})")
            exec_postgres_ddl(args.postgres, "ANALYZE name")
        try:
            f_sql, s_sql = gen_queries(field, "legacyJsonb", args.limit)
            for op, sql in (("filter", f_sql), ("sort", s_sql)):
                label = f"{op:6} {field:24} indexed    "
                try:
                    med, p95, n = time_case(sql)
                    results[op][field]["indexed"] = (med, p95)
                    print(f"{label} ... median {fmt(med)}  p95 {fmt(p95)}  n={n}")
                except Exception as e:
                    results[op][field]["indexed"] = None
                    print(f"{label} ... ERROR: {e}")
        finally:
            # Always drop every index so a follow-up run starts from the
            # same unindexed baseline as the main matrix.
            for idx_name, _ in indexes:
                ddl_drop = f"DROP INDEX IF EXISTS {idx_name}"
                if backend == "sqlite":
                    exec_sqlite_ddl(args.sqlite, ddl_drop)
                else:
                    exec_postgres_ddl(args.postgres, ddl_drop)
    finally:
      close_runner()

    # Summary tables
    print()
    for op in ("filter", "sort"):
        print(f"== {op.upper()} median latency ({backend}) ==")
        print(
            f"{'field':<24}{'legacy':>11}{'jsonb':>11}{'v2':>11}{'indexed':>11}"
        )
        for field in fields:
            row = results[op][field]
            cells = []
            for method in methods + ["indexed"]:
                cell = row.get(method)
                cells.append(fmt(cell[0]) if cell else "    —")
            print(
                f"{field:<24}{cells[0]:>11}{cells[1]:>11}{cells[2]:>11}{cells[3]:>11}"
            )
        print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
