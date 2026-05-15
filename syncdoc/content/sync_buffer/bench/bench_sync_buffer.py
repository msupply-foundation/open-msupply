"""
Config-driven sync buffer benchmark for PostgreSQL.

Highlights:
- Insert-only workload (no upsert conflict path).
- Auto-increment `cursor` primary key.
- Scenario-based table layouts (basic and partitioned variants).
- Per-iteration CSV writes for insert/query/update timings.

Usage:
    python3 bench_sync_buffer.py --db "postgresql://..." --config bench_config.json --csv results.csv

Requires:
    pip install psycopg2-binary
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

try:
    import psycopg2
    import psycopg2.extensions
except ImportError:
    print("ERROR: psycopg2 is required. Install with: pip install psycopg2-binary")
    sys.exit(1)


def generate_table_names(count: int) -> list[str]:
    """Pre-generate non-sequential table names using UUIDs."""
    return [f"tbl_{uuid.uuid4().hex}" for _ in range(count)]


def generate_source_site_ids(count: int) -> list[int]:
    return list(range(1, count + 1))


def build_weighted_list(items: list, rankings: list[int]) -> list:
    """Expand items by ranking weight for weighted insert distribution."""
    weighted = []
    for i, item in enumerate(items):
        weighted.extend([item] * rankings[i])
    return weighted


@dataclass
class QuerySpec:
    table_index: int
    site_index: int


@dataclass
class PostgresConfig:
    host: str
    port: int
    user: str
    password: str
    database: str


@dataclass
class GlobalConfig:
    insert_between_benches: int
    insert_batch_size: int
    insert_iterations: int
    query_iterations: int
    max_minutes_per_scenario: float
    max_total_records: int
    target_pending_after_bench: int
    table_names: list[str]
    weighted_table_names: list[str]
    source_site_ids: list[int]
    weighted_source_site_ids: list[int]
    query_specs: list[QuerySpec] | None


def parse_size(s: str) -> int:
    cleaned = str(s).strip().replace(",", "").replace("_", "")
    if cleaned.upper().endswith("M"):
        return int(float(cleaned[:-1]) * 1_000_000)
    if cleaned.upper().endswith("K"):
        return int(float(cleaned[:-1]) * 1_000)
    return int(cleaned)


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_config(path: str) -> tuple[PostgresConfig, GlobalConfig, list[dict]]:
    with open(path, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    pg_raw = cfg.get("postgres", {})
    if not pg_raw:
        raise ValueError("Config must include a 'postgres' section.")
    pg = PostgresConfig(
        host=str(pg_raw.get("host", "localhost")),
        port=int(pg_raw.get("port", 5432)),
        user=str(pg_raw.get("user", "postgres")),
        password=str(pg_raw.get("password", "")),
        database=str(pg_raw.get("database", "sync_buffer_bench")),
    )

    global_raw = cfg.get("global", {})
    scenarios = cfg.get("scenarios", [])
    if not scenarios:
        raise ValueError("Config must include at least one scenario in 'scenarios'.")

    table_names_count = int(global_raw.get("table_names_count", 10))
    source_site_ids_count = int(global_raw.get("source_site_ids_count", 10))
    if table_names_count <= 0:
        raise ValueError("global.table_names_count must be > 0")
    if source_site_ids_count <= 0:
        raise ValueError("global.source_site_ids_count must be > 0")

    table_rankings = [1] * table_names_count
    site_rankings = [1] * source_site_ids_count
    for entry in global_raw.get("rankings", []):
        rank = int(entry["ranking"])
        if "table" in entry:
            idx = int(entry["table"])
            if idx < 0 or idx >= table_names_count:
                raise ValueError(f"rankings table index {idx} out of range [0, {table_names_count})")
            table_rankings[idx] = rank
        if "site" in entry:
            idx = int(entry["site"])
            if idx < 0 or idx >= source_site_ids_count:
                raise ValueError(f"rankings site index {idx} out of range [0, {source_site_ids_count})")
            site_rankings[idx] = rank

    table_names = generate_table_names(table_names_count)
    weighted_table_names = build_weighted_list(table_names, table_rankings)
    source_site_ids = generate_source_site_ids(source_site_ids_count)
    weighted_source_site_ids = build_weighted_list(source_site_ids, site_rankings)

    query_specs_raw = global_raw.get("query_specs", None)
    query_specs = None
    if query_specs_raw is not None:
        query_specs = []
        for qs in query_specs_raw:
            ti = int(qs["table"])
            si = int(qs["site"])
            if ti < 0 or ti >= table_names_count:
                raise ValueError(f"query_specs table index {ti} out of range [0, {table_names_count})")
            if si < 0 or si >= source_site_ids_count:
                raise ValueError(f"query_specs site index {si} out of range [0, {source_site_ids_count})")
            query_specs.append(QuerySpec(table_index=ti, site_index=si))

    gc = GlobalConfig(
        insert_between_benches=parse_size(global_raw.get("insert_between_benches", 50_000)),
        insert_batch_size=parse_size(global_raw.get("insert_batch_size", 2_000)),
        insert_iterations=int(global_raw.get("insert_iterations", 20)),
        query_iterations=int(global_raw.get("query_iterations", 5)),
        max_minutes_per_scenario=float(global_raw.get("max_minutes_per_scenario", 5)),
        max_total_records=parse_size(global_raw.get("max_total_records", 1_000_000)),
        target_pending_after_bench=parse_size(global_raw.get("target_pending_after_bench", 5_000)),
        table_names=table_names,
        weighted_table_names=weighted_table_names,
        source_site_ids=source_site_ids,
        weighted_source_site_ids=weighted_source_site_ids,
        query_specs=query_specs,
    )

    if gc.insert_between_benches <= 0:
        raise ValueError("global.insert_between_benches must be > 0")
    if gc.insert_batch_size <= 0:
        raise ValueError("global.insert_batch_size must be > 0")
    if gc.insert_iterations <= 0:
        raise ValueError("global.insert_iterations must be > 0")
    if gc.query_iterations <= 0:
        raise ValueError("global.query_iterations must be > 0")
    if gc.max_minutes_per_scenario <= 0:
        raise ValueError("global.max_minutes_per_scenario must be > 0")
    if gc.max_total_records <= 0:
        raise ValueError("global.max_total_records must be > 0")
    if gc.target_pending_after_bench < 0:
        raise ValueError("global.target_pending_after_bench must be >= 0")

    return pg, gc, scenarios


def exec_sql(conn, sql: str, params: tuple | None = None):
    if conn.info.transaction_status != psycopg2.extensions.TRANSACTION_STATUS_IDLE:
        conn.rollback()
    with conn.cursor() as cur:
        cur.execute(sql, params)
    conn.commit()


def with_timing(fn) -> float:
    start = time.perf_counter()
    fn()
    return (time.perf_counter() - start) * 1000


def table_exists(conn, table_name: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT to_regclass(%s)", (table_name,))
        return cur.fetchone()[0] is not None


def current_total_rows(conn) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM sync_buffer")
        return int(cur.fetchone()[0])


SYNC_BUFFER_COLUMNS = """
        cursor               BIGINT GENERATED ALWAYS AS IDENTITY,
        record_id            TEXT NOT NULL,
        received_datetime    TIMESTAMP NOT NULL,
        integrated_datetime  TIMESTAMP,
        integration_error    TEXT,
        table_name           TEXT NOT NULL,
        operation_type       TEXT NOT NULL,
        data                 TEXT NOT NULL,
        source_site_id       INTEGER NOT NULL"""

QUERY_INDEX_COLS = "(table_name, operation_type, source_site_id, cursor DESC)"
PARTIAL_INDEX_COND = "WHERE integrated_datetime IS NULL"


def setup_scenario(conn, scenario: dict, global_cfg: GlobalConfig):
    scenario_type = scenario.get("type", "basic")

    if scenario_type == "basic":
        exec_sql(conn, f"""
            DROP TABLE IF EXISTS sync_buffer CASCADE;
            CREATE TABLE sync_buffer (
                {SYNC_BUFFER_COLUMNS},
                PRIMARY KEY (cursor)
            );

            CREATE INDEX idx_sb_pending_query ON sync_buffer {QUERY_INDEX_COLS}
                {PARTIAL_INDEX_COND};
        """)

    elif scenario_type == "partitioned-indexed":
        exec_sql(conn, f"""
            DROP TABLE IF EXISTS sync_buffer CASCADE;
            CREATE TABLE sync_buffer (
                {SYNC_BUFFER_COLUMNS}
            ) PARTITION BY LIST ((integrated_datetime IS NULL));

            CREATE TABLE sync_buffer_pending PARTITION OF sync_buffer FOR VALUES IN (TRUE);
            CREATE TABLE sync_buffer_done PARTITION OF sync_buffer FOR VALUES IN (FALSE);

            CREATE INDEX idx_sb_query ON sync_buffer {QUERY_INDEX_COLS}
                {PARTIAL_INDEX_COND};
        """)

    elif scenario_type == "partitioned-indexed-pending-only":
        exec_sql(conn, f"""
            DROP TABLE IF EXISTS sync_buffer CASCADE;
            CREATE TABLE sync_buffer (
                {SYNC_BUFFER_COLUMNS}
            ) PARTITION BY LIST ((integrated_datetime IS NULL));

            CREATE TABLE sync_buffer_pending PARTITION OF sync_buffer FOR VALUES IN (TRUE);
            CREATE TABLE sync_buffer_done PARTITION OF sync_buffer FOR VALUES IN (FALSE);

            CREATE INDEX idx_sb_pending_query ON sync_buffer_pending {QUERY_INDEX_COLS}
                {PARTIAL_INDEX_COND};
        """)

    elif scenario_type == "partitioned-done-cursor":
        span = parse_size(scenario.get("done_cursor_partition_size", 250_000))
        if span <= 0:
            raise ValueError("done_cursor_partition_size must be > 0")

        exec_sql(conn, f"""
            DROP TABLE IF EXISTS sync_buffer CASCADE;
            CREATE TABLE sync_buffer (
                {SYNC_BUFFER_COLUMNS}
            ) PARTITION BY LIST ((integrated_datetime IS NULL));

            CREATE TABLE sync_buffer_pending PARTITION OF sync_buffer FOR VALUES IN (TRUE);
            CREATE TABLE sync_buffer_done PARTITION OF sync_buffer
                FOR VALUES IN (FALSE)
                PARTITION BY RANGE (cursor);

            CREATE INDEX idx_sb_query ON sync_buffer {QUERY_INDEX_COLS}
                {PARTIAL_INDEX_COND};
        """)

        upper_bound = global_cfg.max_total_records + span
        for part_start in range(1, upper_bound + 1, span):
            part_end = part_start + span
            exec_sql(
                conn,
                f"CREATE TABLE sync_buffer_done_c_{part_start}_{part_end - 1} "
                f"PARTITION OF sync_buffer_done FOR VALUES FROM ({part_start}) TO ({part_end})",
            )
        exec_sql(conn, "CREATE TABLE sync_buffer_done_overflow PARTITION OF sync_buffer_done DEFAULT")

    else:
        raise ValueError(
            "Unknown scenario type. Expected one of: basic, partitioned-indexed, "
            "partitioned-indexed-pending-only, partitioned-done-cursor"
        )


def bulk_insert_with_generate_series(
    conn,
    count: int,
    table_names: list[str],
    source_site_ids: list[int],
):
    if count <= 0:
        return

    sql = """
    WITH cfg AS (
        SELECT %s::text[] AS table_names, %s::int[] AS source_ids
    ), gs AS (
        SELECT generate_series(1, %s) AS n
    )
    INSERT INTO sync_buffer (
        record_id,
        received_datetime,
        integrated_datetime,
        integration_error,
        table_name,
        operation_type,
        data,
        source_site_id
    )
    SELECT
        format('rid_%%s_%%s', floor(extract(epoch from clock_timestamp())::bigint), n),
        clock_timestamp() - ((n %% 600) * interval '1 second'),
        NULL,
        NULL,
        cfg.table_names[((n - 1) %% array_length(cfg.table_names, 1)) + 1],
        CASE WHEN n %% 2 = 0 THEN 'UPSERT' ELSE 'DELETE' END,
        format('{""mock"":%%s}', n),
        cfg.source_ids[((n - 1) %% array_length(cfg.source_ids, 1)) + 1]
    FROM gs, cfg
    """
    with conn.cursor() as cur:
        cur.execute(sql, (table_names, source_site_ids, count))
    conn.commit()


def query_speed_ms(conn, table_name: str, operation_type: str, source_site_id: int) -> tuple[float, int]:
    sql = """
    EXPLAIN (ANALYZE, FORMAT JSON)
    SELECT *
    FROM sync_buffer
    WHERE integrated_datetime IS NULL
      AND table_name = %s
      AND operation_type = %s
      AND source_site_id = %s
    ORDER BY cursor DESC
    """
    with conn.cursor() as cur:
        cur.execute(sql, (table_name, operation_type, source_site_id))
        plan_json = cur.fetchone()[0]
    plan_root = plan_json[0]
    execution_ms = float(plan_root.get("Execution Time", 0.0))
    planning_ms = float(plan_root.get("Planning Time", 0.0))
    return execution_ms, planning_ms


def set_integrated_leave_pending(conn, target_pending: int) -> int:
    """Integrate all pending rows except the newest `target_pending` ones."""
    if target_pending < 0:
        return 0

    # Find the cursor cutoff: the nth newest pending row
    with conn.cursor() as cur:
        cur.execute(
            "SELECT cursor FROM sync_buffer WHERE integrated_datetime IS NULL "
            "ORDER BY cursor DESC OFFSET %s LIMIT 1",
            (target_pending,),
        )
        row = cur.fetchone()
        if not row:
            conn.commit()
            return 0
        cutoff_cursor = row[0]

    with conn.cursor() as cur:
        cur.execute(
            "UPDATE sync_buffer SET integrated_datetime = clock_timestamp() "
            "WHERE integrated_datetime IS NULL AND cursor <= %s",
            (cutoff_cursor,),
        )
        affected = cur.rowcount
    conn.commit()
    return max(affected, 0)


def sanitize_name(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "_", name.strip())
    return cleaned or "scenario"


def run_scenario(
    conn,
    writer: csv.DictWriter,
    out_handle,
    scenario: dict,
    global_cfg: GlobalConfig,
):
    scenario_name = str(scenario.get("name", "unnamed-scenario"))
    scenario_type = str(scenario.get("type", "basic"))

    print(f"[scenario] Starting: {scenario_name} ({scenario_type})", file=sys.stderr)
    setup_scenario(conn, scenario, global_cfg)
    print(f"[scenario] Schema created", file=sys.stderr)

    max_minutes = float(scenario.get("max_minutes_per_scenario", global_cfg.max_minutes_per_scenario))
    max_total_records = int(scenario.get("max_total_records", global_cfg.max_total_records))
    insert_between = int(scenario.get("insert_between_benches", global_cfg.insert_between_benches))
    insert_batch_size = int(scenario.get("insert_batch_size", global_cfg.insert_batch_size))
    insert_iterations = int(scenario.get("insert_iterations", global_cfg.insert_iterations))
    query_iterations = int(scenario.get("query_iterations", global_cfg.query_iterations))
    target_pending = int(
        scenario.get("target_pending_after_bench", global_cfg.target_pending_after_bench)
    )

    scenario_started = time.perf_counter()
    bench_round = 0

    while True:
        elapsed_minutes = (time.perf_counter() - scenario_started) / 60
        if elapsed_minutes >= max_minutes:
            print(f"[scenario] Stopping: max_minutes={max_minutes} reached", file=sys.stderr)
            break

        total_before = current_total_rows(conn)
        if total_before >= max_total_records:
            print(f"[scenario] Stopping: max_total_records={max_total_records} reached", file=sys.stderr)
            break

        bench_round += 1

        print(f"[round {bench_round}] Inserting {insert_between} rows to grow table...", file=sys.stderr)
        bulk_insert_with_generate_series(
            conn, insert_between, global_cfg.weighted_table_names, global_cfg.weighted_source_site_ids
        )
        total_before = current_total_rows(conn)
        print(f"[round {bench_round}] Table now has {total_before} rows", file=sys.stderr)

        print(f"[round {bench_round}] Insert bench: {insert_iterations} x {insert_batch_size} rows", file=sys.stderr)
        for insert_iter in range(1, insert_iterations + 1):
            if current_total_rows(conn) >= max_total_records:
                break
            duration_ms = with_timing(
                lambda: bulk_insert_with_generate_series(
                    conn,
                    insert_batch_size,
                    global_cfg.table_names,
                    global_cfg.source_site_ids,
                )
            )
            row = {
                "timestamp_utc": now_utc(),
                "scenario_name": scenario_name,
                "scenario_type": scenario_type,
                "bench_round": bench_round,
                "metric_group": "insert",
                "operation": "insert_batch",
                "iteration": insert_iter,
                "table_name": "",
                "source_site_id": "",
                "operation_type": "",
                "duration_ms": round(duration_ms, 4),
                "query_execution_ms": "",
                "query_planning_ms": "",
                "rows_at_bench_start": total_before,
                "total_rows_current": current_total_rows(conn),
                "rows_affected": insert_batch_size,
            }
            writer.writerow(row)
            out_handle.flush()
            if insert_iter % 5 == 0 or insert_iter == insert_iterations:
                print(f"[round {bench_round}]   insert iter {insert_iter}/{insert_iterations}: {duration_ms:.1f}ms", file=sys.stderr)

        if global_cfg.query_specs is not None:
            queries_to_test = [
                (global_cfg.table_names[qs.table_index], global_cfg.source_site_ids[qs.site_index])
                for qs in global_cfg.query_specs
            ]
        else:
            queries_to_test = [
                (tbl, src)
                for tbl in global_cfg.table_names
                for src in global_cfg.source_site_ids
            ]

        print(f"[round {bench_round}] Query bench: {query_iterations} iterations x {len(queries_to_test)} queries x 2 ops", file=sys.stderr)
        for query_iter in range(1, query_iterations + 1):
            for tbl, src in queries_to_test:
                for op_type in ('UPSERT', 'DELETE'):
                    execution_ms, planning_ms = query_speed_ms(conn, tbl, op_type, src)
                    row = {
                        "timestamp_utc": now_utc(),
                        "scenario_name": scenario_name,
                        "scenario_type": scenario_type,
                        "bench_round": bench_round,
                        "metric_group": "query",
                        "operation": "query_by_table_source",
                        "iteration": query_iter,
                        "table_name": tbl,
                        "source_site_id": src,
                        "operation_type": op_type,
                        "duration_ms": round(execution_ms, 4),
                        "query_execution_ms": round(execution_ms, 4),
                        "query_planning_ms": round(planning_ms, 4),
                        "rows_at_bench_start": total_before,
                        "total_rows_current": current_total_rows(conn),
                        "rows_affected": "",
                    }
                    writer.writerow(row)
                    out_handle.flush()
            print(f"[round {bench_round}]   query iter {query_iter}/{query_iterations} done", file=sys.stderr)

        print(f"[round {bench_round}] Update bench: leaving {target_pending} pending...", file=sys.stderr)
        updated_rows_holder = {}
        update_ms = with_timing(lambda: _set_updated_rows(conn, target_pending, updated_rows_holder))
        updated_rows = int(updated_rows_holder.get("rows", 0))
        print(f"[round {bench_round}]   integrated {updated_rows} rows in {update_ms:.1f}ms", file=sys.stderr)
        writer.writerow(
            {
                "timestamp_utc": now_utc(),
                "scenario_name": scenario_name,
                "scenario_type": scenario_type,
                "bench_round": bench_round,
                "metric_group": "update",
                "operation": "set_integrated_true",
                "iteration": 1,
                "table_name": "",
                "source_site_id": "",
                "operation_type": "",
                "duration_ms": round(update_ms, 4),
                "query_execution_ms": "",
                "query_planning_ms": "",
                "rows_at_bench_start": total_before,
                "total_rows_current": current_total_rows(conn),
                "rows_affected": updated_rows,
            }
        )
        out_handle.flush()

    print(f"[scenario] Completed: {scenario_name}", file=sys.stderr)


def _set_updated_rows(conn, target_pending: int, holder: dict):
    holder["rows"] = set_integrated_leave_pending(conn, target_pending)


def ensure_database(pg: PostgresConfig):
    """Connect to the default 'postgres' database and create the target database if it doesn't exist."""
    conn = psycopg2.connect(host=pg.host, port=pg.port, user=pg.user, password=pg.password, database="postgres")
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (pg.database,))
        if not cur.fetchone():
            cur.execute(f"CREATE DATABASE {pg.database}")
            print(f"Created database '{pg.database}'", file=sys.stderr)
    conn.close()


def connect(pg: PostgresConfig):
    return psycopg2.connect(host=pg.host, port=pg.port, user=pg.user, password=pg.password, database=pg.database)


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Config-driven sync_buffer benchmark")
    parser.add_argument(
        "--config",
        default="bench_config.json",
        help="Path to benchmark config JSON (default: bench_config.json)",
    )
    parser.add_argument("--csv", default="results.csv", help="Output CSV path")
    return parser


def main():
    args = build_arg_parser().parse_args()

    try:
        pg_cfg, global_cfg, scenarios = parse_config(args.config)
    except Exception as exc:
        print(f"ERROR: invalid config '{args.config}': {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"[init] Ensuring database '{pg_cfg.database}' on {pg_cfg.host}:{pg_cfg.port}", file=sys.stderr)
    ensure_database(pg_cfg)
    print(f"[init] Connecting to '{pg_cfg.database}'", file=sys.stderr)
    conn = connect(pg_cfg)
    conn.autocommit = False
    print(f"[init] Connected. Running {len(scenarios)} scenario(s), output: {args.csv}", file=sys.stderr)

    fieldnames = [
        "timestamp_utc",
        "scenario_name",
        "scenario_type",
        "bench_round",
        "metric_group",
        "operation",
        "iteration",
        "table_name",
        "source_site_id",
        "operation_type",
        "duration_ms",
        "query_execution_ms",
        "query_planning_ms",
        "rows_at_bench_start",
        "total_rows_current",
        "rows_affected",
    ]

    out_handle = open(args.csv, "w", newline="", encoding="utf-8")
    writer = csv.DictWriter(out_handle, fieldnames=fieldnames)
    writer.writeheader()
    out_handle.flush()

    try:
        for raw_scenario in scenarios:
            scenario = dict(raw_scenario)
            if "name" not in scenario or not str(scenario["name"]).strip():
                scenario["name"] = sanitize_name(str(raw_scenario))
            run_scenario(conn, writer, out_handle, scenario, global_cfg)

        print(f"Wrote benchmark rows to {args.csv}", file=sys.stderr)
    finally:
        out_handle.close()
        conn.close()


if __name__ == "__main__":
    main()