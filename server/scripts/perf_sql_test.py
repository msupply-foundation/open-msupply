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
from typing import Callable, Dict, List, Optional, Tuple


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
# Each case lists `(idx_name, table, expr)` tuples per backend.
# `query_method` says which gen_queries variant the pass should time against;
# `result_key` is the column name used in the summary table / CSV / plot.
#
# Indexes are on the JSONB extract that the SORT query uses (`ORDER BY
# (extract) LIMIT 50` — plain text extract, no cast). For dense fields
# where the filter query uses the same expression (date, option), the
# index helps both filter and sort. For text the filter is `LIKE '%…%'`
# (uncacheable via btree), so the index only helps sort. For number the
# filter casts to integer, so the index helps sort only — adding a second
# integer-cast index for filter is doable but not worth the complexity.
INDEXED_CASES = [
    {
        "field": "text",
        "query_method": "legacyJsonb",
        "result_key": "indexed",
        "sqlite_indexes": [(
            "idx_perf_beans_thoughts_jsonb", "name",
            "json_extract(properties_jsonb, '$.beans_thoughts')",
        )],
        "postgres_indexes": [(
            "idx_perf_beans_thoughts_jsonb", "name",
            "(properties_jsonb ->> 'beans_thoughts')",
        )],
    },
    {
        "field": "number",
        "query_method": "legacyJsonb",
        "result_key": "indexed",
        "sqlite_indexes": [(
            "idx_perf_beans_count_jsonb", "name",
            "json_extract(properties_jsonb, '$.beans_count')",
        )],
        "postgres_indexes": [(
            "idx_perf_beans_count_jsonb", "name",
            "(properties_jsonb ->> 'beans_count')",
        )],
    },
    {
        "field": "option",
        "query_method": "legacyJsonb",
        "result_key": "indexed",
        "sqlite_indexes": [(
            "idx_perf_favourite_bean_jsonb", "name",
            "json_extract(properties_jsonb, '$.favourite_bean')",
        )],
        "postgres_indexes": [(
            "idx_perf_favourite_bean_jsonb", "name",
            "(properties_jsonb ->> 'favourite_bean')",
        )],
    },
    {
        "field": "date",
        "query_method": "legacyJsonb",
        "result_key": "indexed",
        "sqlite_indexes": [(
            "idx_perf_visit_date_jsonb", "name",
            "json_extract(properties_jsonb, '$.visit_date')",
        )],
        "postgres_indexes": [(
            "idx_perf_visit_date_jsonb", "name",
            "(properties_jsonb ->> 'visit_date')",
        )],
    },
    # Sparse fields — only the specific sparse properties the matrix
    # actually queries (chosen at mid density in `SPARSE_LEGACY_KEY`).
    # The other 26 sparse properties go unindexed.
    {
        "field": "text_sparse",
        "query_method": "legacyJsonb",
        "result_key": "indexed",
        "sqlite_indexes": [(
            "idx_perf_sparse_text_09_jsonb", "name",
            "json_extract(properties_jsonb, '$.sparse_text_09')",
        )],
        "postgres_indexes": [(
            "idx_perf_sparse_text_09_jsonb", "name",
            "(properties_jsonb ->> 'sparse_text_09')",
        )],
    },
    {
        "field": "number_sparse",
        "query_method": "legacyJsonb",
        "result_key": "indexed",
        "sqlite_indexes": [(
            "idx_perf_sparse_num_04_jsonb", "name",
            "json_extract(properties_jsonb, '$.sparse_num_04')",
        )],
        "postgres_indexes": [(
            "idx_perf_sparse_num_04_jsonb", "name",
            "(properties_jsonb ->> 'sparse_num_04')",
        )],
    },
    {
        "field": "option_sparse",
        "query_method": "legacyJsonb",
        "result_key": "indexed",
        "sqlite_indexes": [(
            "idx_perf_sparse_opt_04_jsonb", "name",
            "json_extract(properties_jsonb, '$.sparse_opt_04')",
        )],
        "postgres_indexes": [(
            "idx_perf_sparse_opt_04_jsonb", "name",
            "(properties_jsonb ->> 'sparse_opt_04')",
        )],
    },
    {
        "field": "date_sparse",
        "query_method": "legacyJsonb",
        "result_key": "indexed",
        "sqlite_indexes": [(
            "idx_perf_sparse_date_05_jsonb", "name",
            "json_extract(properties_jsonb, '$.sparse_date_05')",
        )],
        "postgres_indexes": [(
            "idx_perf_sparse_date_05_jsonb", "name",
            "(properties_jsonb ->> 'sparse_date_05')",
        )],
    },
]


# -- V2 indexed pass --------------------------------------------------------
#
# Best-attempt composite index per value-column type: `(table_name,
# property_id, value_<type>)` on property_v2_value. Index expression is
# identical between SQLite and Postgres. We expect:
#   - filter (=, BETWEEN): index used, big win for number/option/date.
#                          text filter is LIKE '%…%' → btree useless.
#   - sort (LEFT JOIN ORDER BY pv.value_<type>): index NOT used because
#     the LEFT JOIN forces a name-side drive. Empirically confirmed on
#     both backends. Including these cases anyway because the user wants
#     to see how much it actually helps for sparse where the LEFT JOIN
#     scan can short-circuit on NOT-EXISTS earlier than on dense.
V2_INDEXED_CASES = [
    {
        "field": "text",
        "query_method": "v2",
        "result_key": "v2_indexed",
        "sqlite_indexes": [(
            "idx_perf_pv2_value_text", "property_v2_value",
            "table_name, property_id, value_text",
        )],
        "postgres_indexes": [(
            "idx_perf_pv2_value_text", "property_v2_value",
            "table_name, property_id, value_text",
        )],
    },
    {
        "field": "number",
        "query_method": "v2",
        "result_key": "v2_indexed",
        "sqlite_indexes": [(
            "idx_perf_pv2_value_number", "property_v2_value",
            "table_name, property_id, value_number",
        )],
        "postgres_indexes": [(
            "idx_perf_pv2_value_number", "property_v2_value",
            "table_name, property_id, value_number",
        )],
    },
    {
        "field": "option",
        "query_method": "v2",
        "result_key": "v2_indexed",
        "sqlite_indexes": [(
            "idx_perf_pv2_value_option_id", "property_v2_value",
            "table_name, property_id, value_option_id",
        )],
        "postgres_indexes": [(
            "idx_perf_pv2_value_option_id", "property_v2_value",
            "table_name, property_id, value_option_id",
        )],
    },
    {
        "field": "date",
        "query_method": "v2",
        "result_key": "v2_indexed",
        "sqlite_indexes": [(
            "idx_perf_pv2_value_date", "property_v2_value",
            "table_name, property_id, value_date",
        )],
        "postgres_indexes": [(
            "idx_perf_pv2_value_date", "property_v2_value",
            "table_name, property_id, value_date",
        )],
    },
    # Sparse variants reuse the same value-type indexes — they're keyed by
    # (table_name, property_id, value_<type>), so the leading two cols pin
    # the index to whichever property_id the query targets. We still define
    # one case per sparse field because run_indexed_pass is keyed by field
    # name; the index is recreated each case (~minute on 18M rows). If that
    # turns out to dominate, we can teach the helper to batch related cases.
    {
        "field": "text_sparse",
        "query_method": "v2",
        "result_key": "v2_indexed",
        "sqlite_indexes": [(
            "idx_perf_pv2_value_text", "property_v2_value",
            "table_name, property_id, value_text",
        )],
        "postgres_indexes": [(
            "idx_perf_pv2_value_text", "property_v2_value",
            "table_name, property_id, value_text",
        )],
    },
    {
        "field": "number_sparse",
        "query_method": "v2",
        "result_key": "v2_indexed",
        "sqlite_indexes": [(
            "idx_perf_pv2_value_number", "property_v2_value",
            "table_name, property_id, value_number",
        )],
        "postgres_indexes": [(
            "idx_perf_pv2_value_number", "property_v2_value",
            "table_name, property_id, value_number",
        )],
    },
    {
        "field": "option_sparse",
        "query_method": "v2",
        "result_key": "v2_indexed",
        "sqlite_indexes": [(
            "idx_perf_pv2_value_option_id", "property_v2_value",
            "table_name, property_id, value_option_id",
        )],
        "postgres_indexes": [(
            "idx_perf_pv2_value_option_id", "property_v2_value",
            "table_name, property_id, value_option_id",
        )],
    },
    {
        "field": "date_sparse",
        "query_method": "v2",
        "result_key": "v2_indexed",
        "sqlite_indexes": [(
            "idx_perf_pv2_value_date", "property_v2_value",
            "table_name, property_id, value_date",
        )],
        "postgres_indexes": [(
            "idx_perf_pv2_value_date", "property_v2_value",
            "table_name, property_id, value_date",
        )],
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

# Unified seed files — same SQL for both modes, just different table-name
# substitutions. See the seed files' headers for placeholder docs.
SEED_DENSE_SQLITE      = "seed_perf_dense.sqlite.sql"
SEED_DENSE_POSTGRES    = "seed_perf_dense.postgres.sql"
SEED_SPARSE_SQLITE     = "seed_perf_sparse.sqlite.sql"
SEED_SPARSE_POSTGRES   = "seed_perf_sparse.postgres.sql"

# Mode-specific init scripts: OMS gets property_v2 / property defs + options
# (FK targets the value rows reference); standalone gets the per-size table
# schema + perf_pv2_option seed.
INIT_OMS_SQLITE        = "init_perf_oms_metadata.sqlite.sql"
INIT_OMS_POSTGRES      = "init_perf_oms_metadata.postgres.sql"
INIT_SCHEMA_FILE       = "init_perf_schema.sql"  # standalone-only, single file


def _load_sql(filename: str, replacements: dict) -> str:
    """Load `filename` from SCRIPTS_DIR and `str.replace` each (key → value).
    Used by both modes to substitute the placeholders the SQL files use."""
    with open(os.path.join(SCRIPTS_DIR, filename), "r") as f:
        sql = f.read()
    for k, v in replacements.items():
        sql = sql.replace(k, v)
    return sql


def _oms_replacements(size: int) -> dict:
    return {
        "__SIZE__":              str(size),
        "__NAME_TABLE__":        "name",
        "__PV2_VALUE_TABLE__":   "property_v2_value",
        "__PV2_OPTION_TABLE__":  "property_v2_option",
    }


def _standalone_replacements(size: int, jsonb_type: str) -> dict:
    return {
        "__SIZE__":              str(size),
        "__JSONB_TYPE__":        jsonb_type,
        "__NAME_TABLE__":        f"perf_name_{size}",
        "__PV2_VALUE_TABLE__":   f"perf_pv2_value_{size}",
        "__PV2_OPTION_TABLE__":  "perf_pv2_option",
    }


# Cleanup SQL — OMS mode only. Standalone uses separate per-size tables
# that don't conflict between sizes, so no inter-size cleanup is needed.
CLEANUP_FILE = "cleanup_perf.sql"


def _load_cleanup_sql() -> str:
    with open(os.path.join(SCRIPTS_DIR, CLEANUP_FILE), "r") as f:
        return f.read()


def cleanup_sqlite(db_path: str) -> None:
    run_sql_sqlite(db_path, _load_cleanup_sql())


def cleanup_postgres(conn_str: str) -> None:
    run_sql_postgres(conn_str, _load_cleanup_sql())


def seed_lifecycle(
    backend: str, target: str, size: int, skip_sparse: bool = False,
) -> Tuple[float, float, float]:
    """OMS-mode lifecycle: cleanup → init OMS metadata → seed dense
    (+ optional sparse) using the unified seed files with OMS table names.
    Returns `(cleanup_ms, seed_dense_ms, seed_sparse_ms)`."""
    if backend == "sqlite":
        run_sql, init_file = run_sql_sqlite, INIT_OMS_SQLITE
        dense_file, sparse_file = SEED_DENSE_SQLITE, SEED_SPARSE_SQLITE
        cleanup = cleanup_sqlite
    else:
        run_sql, init_file = run_sql_postgres, INIT_OMS_POSTGRES
        dense_file, sparse_file = SEED_DENSE_POSTGRES, SEED_SPARSE_POSTGRES
        cleanup = cleanup_postgres
    repl = _oms_replacements(size)

    t0 = time.perf_counter()
    cleanup(target)
    cleanup_ms = (time.perf_counter() - t0) * 1000.0

    # OMS metadata is small + idempotent — fold into dense_ms rather than
    # report separately (it's a per-DB one-shot in practice).
    t0 = time.perf_counter()
    run_sql(target, _load_sql(init_file, repl))
    run_sql(target, _load_sql(dense_file, repl))
    seed_dense_ms = (time.perf_counter() - t0) * 1000.0

    seed_sparse_ms = 0.0
    if not skip_sparse:
        t0 = time.perf_counter()
        run_sql(target, _load_sql(sparse_file, repl))
        seed_sparse_ms = (time.perf_counter() - t0) * 1000.0

    return cleanup_ms, seed_dense_ms, seed_sparse_ms


def probe_standalone_size_count(backend: str, target: str, size: int) -> int:
    """Return row count of perf_name_<size>. Returns -1 if the table doesn't
    exist (treated by callers as "must seed")."""
    table = f"perf_name_{size}"
    if backend == "sqlite":
        conn = sqlite3.connect(target)
        try:
            cur = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                (table,),
            )
            if cur.fetchone() is None:
                return -1
            return int(conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])
        finally:
            conn.close()
    # Two-step probe — Postgres `COUNT(*) FROM <missing>` errors out.
    exists = subprocess.run(
        ["psql", target, "-A", "-t", "-q", "-X", "-c",
         f"SELECT to_regclass('public.{table}') IS NOT NULL"],
        capture_output=True, text=True, check=True,
    )
    if (exists.stdout.strip().splitlines()[-1] or "f").lower() in ("f", "false"):
        return -1
    count = subprocess.run(
        ["psql", target, "-A", "-t", "-q", "-X", "-c",
         f"SELECT COUNT(*) FROM {table}"],
        capture_output=True, text=True, check=True,
    )
    return int(count.stdout.strip().splitlines()[-1] or "0")


def ensure_perf_size(
    backend: str, target: str, size: int, skip_sparse: bool = False,
) -> Tuple[float, float, float]:
    """Standalone-mode lifecycle: idempotent CREATE per-size tables + seed
    dense (+ optional sparse) using the unified seed files with the
    standalone table names. Returns `(init_ms, seed_dense_ms,
    seed_sparse_ms)`. Re-runs at the same size short-circuit on count probe."""
    if backend == "sqlite":
        run_sql, jsonb_type = run_sql_sqlite, "TEXT"
        dense_file, sparse_file = SEED_DENSE_SQLITE, SEED_SPARSE_SQLITE
    else:
        run_sql, jsonb_type = run_sql_postgres, "JSONB"
        dense_file, sparse_file = SEED_DENSE_POSTGRES, SEED_SPARSE_POSTGRES
    repl = _standalone_replacements(size, jsonb_type)

    # Always run init — CREATE TABLE/INDEX IF NOT EXISTS is cheap.
    t0 = time.perf_counter()
    run_sql(target, _load_sql(INIT_SCHEMA_FILE, repl))
    init_ms = (time.perf_counter() - t0) * 1000.0

    # Probe count; skip dense seed if the table already has the requested N.
    existing = probe_standalone_size_count(backend, target, size)
    seed_dense_ms = 0.0
    if existing < size:
        t0 = time.perf_counter()
        run_sql(target, _load_sql(dense_file, repl))
        seed_dense_ms = (time.perf_counter() - t0) * 1000.0

    seed_sparse_ms = 0.0
    if not skip_sparse:
        # The sparse seed is idempotent (ON CONFLICT DO NOTHING) so re-runs
        # are cheap but not free — at large N the row-count check + LIKE
        # filter still scans. We accept that for now.
        t0 = time.perf_counter()
        run_sql(target, _load_sql(sparse_file, repl))
        seed_sparse_ms = (time.perf_counter() - t0) * 1000.0

    return init_ms, seed_dense_ms, seed_sparse_ms


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


def run_indexed_pass(
    backend: str,
    target: str,
    cases: List[dict],
    gen_queries: Callable[..., Tuple[str, str]],
    time_case: Callable[[str], Tuple[float, float, int]],
    results: dict,
    limit: int,
    fields_filter: Optional[set] = None,
    label_prefix: str = "",
    tables: Optional[dict] = None,
    size_suffix: str = "",
) -> None:
    """CREATE every index in each case, ANALYZE the touched tables, time
    `gen_queries(field, case.query_method, limit)` against those indexes,
    store under `results[op][field][case.result_key]`, then DROP.

    In standalone mode, the case's logical table name (`name` or
    `property_v2_value`) is resolved via `tables` and `size_suffix` is
    appended to the index name so per-size indexes don't collide. OMS mode
    leaves both untouched (size_suffix='', tables=OMS_TABLES)."""
    for case in cases:
        field = case["field"]
        if field not in results["filter"]:
            continue
        if fields_filter is not None and field not in fields_filter:
            continue
        indexes = case["sqlite_indexes" if backend == "sqlite" else "postgres_indexes"]
        query_method = case["query_method"]
        result_key = case["result_key"]

        # Resolve each index's table via the tables dict (standalone mode
        # swaps to per-size tables). The `table` field in the case is the
        # logical OMS name; `tables` maps it to the actual table name.
        resolved_indexes = []
        for idx_name, table, expr in indexes:
            # Map literal OMS table name to its tables-dict key.
            if tables is not None and tables is not OMS_TABLES:
                key = {"name": "name",
                       "property_v2_value": "pv2_value",
                       "property_v2_option": "pv2_option"}.get(table, table)
                actual_table = tables.get(key, table)
            else:
                actual_table = table
            actual_idx = idx_name + size_suffix
            resolved_indexes.append((actual_idx, actual_table, expr))

        ddl_exec = exec_sqlite_ddl if backend == "sqlite" else exec_postgres_ddl
        for idx_name, table, expr in resolved_indexes:
            ddl_exec(target, f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({expr})")
        for table in sorted({t for _, t, _ in resolved_indexes}):
            ddl_exec(target, f"ANALYZE {table}")

        try:
            f_sql, s_sql = gen_queries(field, query_method, limit, tables)
            for op, sql in (("filter", f_sql), ("sort", s_sql)):
                label = f"{label_prefix}{op:6} {field:24} {result_key:11}"
                try:
                    med, p95, n = time_case(sql)
                    results[op][field][result_key] = (med, p95)
                    print(f"{label} ... median {fmt(med)}  p95 {fmt(p95)}  n={n}")
                except Exception as e:
                    results[op][field][result_key] = None
                    print(f"{label} ... ERROR: {e}")
        finally:
            # Always drop every index so a follow-up run starts from the
            # same unindexed baseline as the main matrix.
            for idx_name, _, _ in resolved_indexes:
                ddl_exec(target, f"DROP INDEX IF EXISTS {idx_name}")


SORT_SHAPE = "leftjoin"  # set in main(); 'leftjoin' or 'correlated'


# Logical → actual table-name resolution. OMS mode uses the schema as-is;
# standalone mode swaps to per-size `perf_*_<N>` tables created from
# `init_perf_schema.sql`. Queries here are built with the OMS names and
# post-processed via `_substitute_tables` so the query SQL doesn't have to
# care which mode it's running in.
OMS_TABLES: dict = {
    "name":       "name",
    "pv2_value":  "property_v2_value",
    "pv2_option": "property_v2_option",
}


def resolve_tables(standalone: bool, size: Optional[int]) -> dict:
    if not standalone:
        return OMS_TABLES
    if size is None:
        raise ValueError("standalone mode requires a size")
    return {
        "name":       f"perf_name_{size}",
        "pv2_value":  f"perf_pv2_value_{size}",
        "pv2_option": "perf_pv2_option",  # shared across sizes
    }


def _substitute_tables(sql: str, tables: dict) -> str:
    """Swap OMS table refs for the resolved ones. Order matters — most
    specific patterns first so we don't double-substitute. `FROM name n`
    keeps the v2 alias; `FROM name` (no alias) becomes `FROM <new> AS name`
    so legacy `name.col` column refs continue to resolve."""
    if tables is OMS_TABLES:
        return sql
    sql = sql.replace("FROM name n", f"FROM {tables['name']} n")
    sql = sql.replace("FROM name ",  f"FROM {tables['name']} AS name ")
    sql = sql.replace("property_v2_value",  tables["pv2_value"])
    sql = sql.replace("property_v2_option", tables["pv2_option"])
    return sql


def queries_sqlite(field: str, method: str, limit: int, tables: Optional[dict] = None) -> Tuple[str, str]:
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


def queries_postgres(field: str, method: str, limit: int, tables: Optional[dict] = None) -> Tuple[str, str]:
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


# -- CSV output -------------------------------------------------------------
#
# Shared between the per-size matrix runner here and the sweep loop. Format
# matches what `perf_scale_plot.py` expects, so a CSV from any invocation
# plots the same way.

import csv  # noqa: E402

CSV_FIELDNAMES = [
    "backend", "size", "op", "field", "method",
    "median_ms", "p95_ms",
    "cleanup_ms", "seed_ms_dense", "seed_ms_sparse",
]


def _open_incremental_csv(path: str):
    """Open CSV for incremental writes in APPEND mode (safer than 'w' —
    won't clobber prior runs you forgot you cared about). Header is only
    written if the file is new/empty. Flush after every appended row block
    so worst-case crash loss is one size's worth of data.

    To start fresh, delete the file first.
    """
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


def has_sparse(backend: str, target: str) -> bool:
    return has_sparse_sqlite(target) if backend == "sqlite" else has_sparse_postgres(target)


def probe_perf_store_count(backend: str, target: str) -> int:
    """Return number of perf_store_* rows currently in `name`. Used as the
    'size' column in the CSV when running without --sizes (against an
    existing DB) so plots can still place the data point on an N axis."""
    sql = "SELECT COUNT(*) FROM name WHERE id LIKE 'perf_store_%'"
    if backend == "sqlite":
        conn = sqlite3.connect(target)
        try:
            return int(conn.execute(sql).fetchone()[0])
        finally:
            conn.close()
    result = subprocess.run(
        ["psql", target, "-A", "-t", "-q", "-X", "-c", sql],
        capture_output=True, text=True, check=True,
    )
    return int((result.stdout.strip() or "0").splitlines()[-1])


# -- Per-size matrix runner -------------------------------------------------


def run_matrix_at_size(
    backend: str,
    target: str,
    size_label: int,
    gen_queries: Callable[..., Tuple[str, str]],
    make_runner: Callable[[str], Callable[[], None]],
    iterations: int,
    limit: int,
    budget_ms: Optional[float],
    fields: List[str],
    fields_filter: Optional[set],
    methods_filter: Optional[set],
    sparse_seeded: bool,  # noqa: ARG001 — present for future use
    cleanup_ms: float = 0.0,
    seed_dense_ms: float = 0.0,
    seed_sparse_ms: float = 0.0,
    csv_writer=None,
    csv_file=None,
    label_prefix: str = "",
    tables: Optional[dict] = None,
    size_suffix: str = "",
) -> Dict:
    """Run the legacy/legacyJsonb/v2 matrix + the two indexed passes against
    the current DB state. Returns the results dict; optionally appends rows
    to the open CSV writer (flushed per-size). `tables` and `size_suffix`
    are threaded through to queries + indexed passes so standalone mode
    targets the per-size `perf_*_<N>` tables (and per-size index names)."""

    results: Dict[str, Dict[str, Dict[str, Optional[Tuple[float, float]]]]] = {
        "filter": {f: {} for f in fields},
        "sort":   {f: {} for f in fields},
    }

    def method_enabled(m: str) -> bool:
        return methods_filter is None or m in methods_filter

    def time_case(sql: str) -> Tuple[float, float, int]:
        if budget_ms is not None:
            return time_query_budgeted(make_runner(sql), iterations, budget_ms)
        return time_query(make_runner(sql), iterations)

    # Wrap gen_queries to apply table substitution at every return path
    # (queries_*.py has three returns — nested/legacy/v2 — and adding
    # substitution to each is fragile).
    base_gen = gen_queries
    def gen_queries_subst(field, method, limit, _tables=None):  # noqa: ARG001
        f, s = base_gen(field, method, limit)
        if tables is not None:
            f = _substitute_tables(f, tables)
            s = _substitute_tables(s, tables)
        return f, s
    gen_queries = gen_queries_subst

    # Matrix
    for field in fields:
        for method in applicable_methods(field):
            if not method_enabled(method):
                continue
            try:
                f_sql, s_sql = gen_queries(field, method, limit, tables)
            except Exception as e:
                print(f"{label_prefix}  query-gen ERROR {field}/{method}: {e}")
                continue
            for op, sql in (("filter", f_sql), ("sort", s_sql)):
                label = f"{label_prefix}{op:6} {field:24} {method:11}"
                try:
                    med, p95, n = time_case(sql)
                    results[op][field][method] = (med, p95)
                    print(f"{label} ... median {fmt(med)}  p95 {fmt(p95)}  n={n}")
                except Exception as e:
                    results[op][field][method] = None
                    print(f"{label} ... ERROR: {e}")

    # Indexed passes
    if method_enabled("indexed"):
        print(f"\n{label_prefix}== indexed pass (functional index on JSONB extracts) ==")
        run_indexed_pass(
            backend=backend, target=target, cases=INDEXED_CASES,
            gen_queries=gen_queries, time_case=time_case,
            results=results, limit=limit,
            fields_filter=fields_filter, label_prefix=label_prefix,
            tables=tables, size_suffix=size_suffix,
        )
    if method_enabled("v2_indexed"):
        print(f"\n{label_prefix}== v2 indexed pass (composite index on property_v2_value) ==")
        run_indexed_pass(
            backend=backend, target=target, cases=V2_INDEXED_CASES,
            gen_queries=gen_queries, time_case=time_case,
            results=results, limit=limit,
            fields_filter=fields_filter, label_prefix=label_prefix,
            tables=tables, size_suffix=size_suffix,
        )

    # CSV append (per-size flush, like the old perf_scale.run_sweep)
    if csv_writer is not None:
        method_cols = ["legacy", "legacyJsonb", "v2", "indexed", "v2_indexed"]
        for op in ("filter", "sort"):
            for field in fields:
                for m in method_cols:
                    v = results[op][field].get(m)
                    if v is None:
                        continue
                    csv_writer.writerow({
                        "backend": backend, "size": size_label,
                        "op": op, "field": field, "method": m,
                        "median_ms": v[0], "p95_ms": v[1],
                        "cleanup_ms": cleanup_ms,
                        "seed_ms_dense": seed_dense_ms,
                        "seed_ms_sparse": seed_sparse_ms,
                    })
        if csv_file is not None:
            csv_file.flush()

    return results


def print_summary_tables(results: Dict, fields: List[str], backend: str, size_label: Optional[int] = None) -> None:
    method_cols = ["legacy", "legacyJsonb", "v2", "indexed", "v2_indexed"]
    col_labels = ["legacy", "jsonb", "v2", "indexed", "v2_idx"]
    header_suffix = f", N={size_label:,}" if size_label is not None else ""
    print()
    for op in ("filter", "sort"):
        print(f"== {op.upper()} median latency ({backend}{header_suffix}) ==")
        print(f"{'field':<24}" + "".join(f"{lbl:>11}" for lbl in col_labels))
        for field in fields:
            row = results[op][field]
            cells = []
            for method in method_cols:
                cell = row.get(method)
                cells.append(fmt(cell[0]) if cell else "    —")
            print(f"{field:<24}" + "".join(f"{c:>11}" for c in cells))
        print()


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
        "--sizes", type=parse_sizes, default=None,
        help="Comma-separated store counts. If given, the script runs as a "
        "sweep: clean → seed → matrix for each size. If omitted, the matrix "
        "runs once against whatever data is already in the DB (size column "
        "in the CSV is the probed perf_store_% count).",
    )
    ap.add_argument(
        "--skip-sparse", action="store_true",
        help="When seeding via --sizes, skip the 30 variably-sparse properties.",
    )
    ap.add_argument(
        "--standalone", action="store_true",
        help="Use per-size standalone tables (perf_name_<N>, perf_pv2_value_<N>) "
        "instead of the OMS schema. Doesn't require a pre-existing OMS DB and "
        "skips the slow cleanup between sizes — idempotent CREATE+seed per "
        "size, data persists across runs. Pair with --sizes.",
    )
    ap.add_argument(
        "--per-case-budget-ms", type=float, default=None,
        help="Soft time budget per query case. With this set the timer runs "
        "`min(--iterations, floor(budget / warmup_ms))` samples (floored at 1) "
        "so slow cases gracefully degrade. Default 1500 when --sizes used, "
        "unset otherwise.",
    )
    ap.add_argument(
        "--fields", default=None,
        help="Comma-separated list of fields to include (e.g. 'date' or "
        "'date,number'). Default: all dense fields plus sparse/nested if "
        "the data is present.",
    )
    ap.add_argument(
        "--methods", default=None,
        help="Comma-separated list of methods to run. Choices: legacy, "
        "legacyJsonb, v2, indexed, v2_indexed. Default: all.",
    )
    ap.add_argument(
        "--csv-out", default="/tmp/perf_sql_test.csv",
        help="Stream results to this CSV path (incremental, append-only, "
        "flush per-size). Default /tmp/perf_sql_test.csv.",
    )
    ap.add_argument("--plot-out", default=None,
        help="Render a scaling plot at the end (calls perf_scale_plot).")
    ap.add_argument("--yscale", choices=["log", "linear"], default="log",
        help="Y-axis scale for --plot-out (default log).")
    args = ap.parse_args()

    fields_filter = (
        set(s.strip() for s in args.fields.split(",") if s.strip())
        if args.fields else None
    )
    methods_filter = (
        set(s.strip() for s in args.methods.split(",") if s.strip())
        if args.methods else None
    )
    global SORT_SHAPE
    SORT_SHAPE = args.sort_shape

    if not args.sqlite and not args.postgres:
        ap.error("specify --sqlite and/or --postgres")

    # Budget default depends on mode — sweep can run multi-second sort cases
    # at large N, single-shot usually doesn't need a budget cap.
    budget_ms = args.per_case_budget_ms
    if budget_ms is None and args.sizes is not None:
        budget_ms = 1500.0

    install_sigint_handler()

    backends: List[Tuple[str, str]] = []
    if args.sqlite:
        backends.append(("sqlite", args.sqlite))
    if args.postgres:
        backends.append(("postgres", args.postgres))

    print(f"Backends:   {', '.join(b for b, _ in backends)}")
    print(f"Iterations: {args.iterations} (+1 warmup)   LIMIT: {args.limit}")
    print(f"V2 sort:    {SORT_SHAPE}")
    if args.sizes:
        print(f"Sizes:      {', '.join(f'{n:,}' for n in args.sizes)}")
        print(f"Sparse:     {'skipped' if args.skip_sparse else 'included'}")
    else:
        print(f"Sizes:      <run against existing DB state, no seed>")
    if fields_filter is not None:
        print(f"Fields:     {','.join(sorted(fields_filter))} (filtered)")
    if methods_filter is not None:
        print(f"Methods:    {','.join(sorted(methods_filter))} (filtered)")
    print()

    # CSV is opened upfront so a sweep crash mid-flight still leaves
    # completed sizes on disk.
    csv_file, csv_writer = (None, None)
    if args.csv_out:
        csv_file, csv_writer = _open_incremental_csv(args.csv_out)
        print(f"streaming CSV → {args.csv_out}")
        print()

    def make_runner_for(backend: str, target: str):
        if backend == "sqlite":
            return make_sqlite_runner(target)
        return make_psql_runner(target)

    def queries_for(backend: str):
        return queries_sqlite if backend == "sqlite" else queries_postgres

    try:
        for backend, target in backends:
            for size in (args.sizes if args.sizes is not None else [None]):
                cleanup_ms = seed_dense_ms = seed_sparse_ms = 0.0
                if args.standalone:
                    if size is None:
                        ap.error("--standalone requires --sizes (need an N to pick a table)")
                    tables = resolve_tables(standalone=True, size=size)
                    size_suffix = f"_{size}"
                    print(f"=== {backend} N={size:,} (standalone) ===")
                    print(f"[{backend}] ensure perf_*_{size} (sparse "
                          f"{'skipped' if args.skip_sparse else 'included'}) …", flush=True)
                    cleanup_ms, seed_dense_ms, seed_sparse_ms = ensure_perf_size(
                        backend, target, size, skip_sparse=args.skip_sparse,
                    )
                    print(f"[{backend}] init={cleanup_ms/1000:.1f}s  "
                          f"seed_dense={seed_dense_ms/1000:.1f}s  "
                          f"seed_sparse={seed_sparse_ms/1000:.1f}s")
                    size_label = size
                    # In standalone, sparse presence is determined by whether
                    # we just seeded (or pre-existing seeded) sparse data.
                    sparse_seeded = not args.skip_sparse
                elif size is not None:
                    tables = None  # OMS_TABLES — use as-is
                    size_suffix = ""
                    print(f"=== {backend} N={size:,} ===")
                    print(f"[{backend}] cleanup + seed (sparse "
                          f"{'skipped' if args.skip_sparse else 'included'}) …", flush=True)
                    cleanup_ms, seed_dense_ms, seed_sparse_ms = seed_lifecycle(
                        backend, target, size, skip_sparse=args.skip_sparse,
                    )
                    print(f"[{backend}] cleanup={cleanup_ms/1000:.1f}s  "
                          f"seed_dense={seed_dense_ms/1000:.1f}s  "
                          f"seed_sparse={seed_sparse_ms/1000:.1f}s")
                    size_label = size
                    sparse_seeded = has_sparse(backend, target)
                else:
                    tables = None
                    size_suffix = ""
                    size_label = probe_perf_store_count(backend, target)
                    print(f"=== {backend} (existing data, N={size_label:,}) ===")
                    sparse_seeded = has_sparse(backend, target)

                fields = ["text", "number", "option", "date"] + NESTED_FIELDS_DENSE
                if sparse_seeded:
                    fields = fields + SPARSE_FIELDS + NESTED_FIELDS_SPARSE
                if fields_filter is not None:
                    fields = [f for f in fields if f in fields_filter]

                make_runner, close_runner = make_runner_for(backend, target)
                try:
                    results = run_matrix_at_size(
                        backend=backend, target=target, size_label=size_label,
                        gen_queries=queries_for(backend),
                        make_runner=make_runner,
                        iterations=args.iterations, limit=args.limit,
                        budget_ms=budget_ms,
                        fields=fields, fields_filter=fields_filter,
                        methods_filter=methods_filter,
                        sparse_seeded=sparse_seeded,
                        cleanup_ms=cleanup_ms,
                        seed_dense_ms=seed_dense_ms,
                        seed_sparse_ms=seed_sparse_ms,
                        csv_writer=csv_writer, csv_file=csv_file,
                        label_prefix="  " if size is not None else "",
                        tables=tables, size_suffix=size_suffix,
                    )
                finally:
                    close_runner()
                print_summary_tables(
                    results, fields, backend,
                    size_label=size_label if (size is not None or args.csv_out) else None,
                )
    finally:
        if csv_file is not None:
            csv_file.close()
            print(f"wrote CSV: {args.csv_out}")

    if args.plot_out and args.csv_out:
        try:
            from perf_scale_plot import render, load_csv
            rows = load_csv(args.csv_out)
            render(rows, args.plot_out, yscale=args.yscale)
        except ImportError as e:
            print(f"could not import perf_scale_plot: {e}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
