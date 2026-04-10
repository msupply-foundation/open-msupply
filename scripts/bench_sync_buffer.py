"""
Sync buffer scaling benchmark for PostgreSQL.

Tests insert, query, and mark-integrated performance across table sizes,
comparing standard table vs native LIST partitioning (is_integrated BOOLEAN).

Requires: pip install psycopg2-binary

Pass in connection string via --db or set DATABASE_URL env.
Examples:
    # Standard table: test every 500K from 1M to 5M
    python3 bench_sync_buffer.py --db "connection_string" --min 1000000 --max 5000000 --interval 500000

    # Partitioned table comparison
    python3 bench_sync_buffer.py --db "connection_string" --min 1000000 --max 5000000 --interval 500000 --partitioned

    # Also vary unintegrated count (default: 1% of total)
    python3 bench_sync_buffer.py --db "connection_string" --min 1000000 --max 5000000 --interval 500000 
        --pending-min 1000 --pending-max 100000 --pending-interval 10000

Output is CSV (to stdout or file) with columns:
    total_rows, pending_rows, approach, operation, duration_ms
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time

try:
    import psycopg2
    import psycopg2.extensions
except ImportError:
    print("ERROR: psycopg2 is required.  Install with:")
    print("  pip install psycopg2-binary")
    sys.exit(1)

# ─── Mock data ───────────────────────────────────────────────────────────────
MOCK_TABLE_NAMES = [
    "name", "store", "transact", "trans_line", "item",
    "item_line", "list_master", "list_master_line", "unit", "stocktake",
]


def mock_trans_line_json(record_id: str) -> str:
    return json.dumps({
        "ID": record_id, "Weight": 0, "barcodeID": "",
        "batch": "batch_abc_123", "box_number": "", "cost_price": 10.5,
        "custom_data": None, "expiry_date": "2026-06-30",
        "foreign_currency_price": 0, "goods_received_lines_ID": "",
        "isVVMPassed": "", "is_from_inventory_adjustment": False,
        "item_ID": f"item_{record_id}", "item_line_ID": f"item_line_{record_id}",
        "item_name": "Amoxicillin 250mg Caps", "line_number": 1,
        "linked_trans_line_ID": "", "linked_transact_id": "",
        "local_charge_line_total": 0, "location_ID": "", "manufacturer_ID": "",
        "medicine_administrator_ID": "", "note": "standard supply for facility",
        "optionID": "", "order_lines_ID": "", "pack_inners_in_outer": 0,
        "pack_size": 100, "pack_size_inner": 0, "prescribedQuantity": 0,
        "price_extension": 105.0, "quantity": 10, "repeat_ID": "",
        "sell_price": 12.5, "sentQuantity": 0, "sent_pack_size": 100,
        "source_backorder_id": "", "spare": 0, "supp_trans_line_ID_ns": "",
        "transaction_ID": f"trans_{record_id}", "type": "stock_in",
        "user_1": "", "user_2": "", "user_3": "", "user_4": "",
        "user_5_ID": "", "user_6_ID": "", "user_7_ID": "", "user_8_ID": "",
        "vaccine_vial_monitor_status_ID": "", "volume_per_pack": 10,
        "om_item_variant_id": "", "donor_id": "", "oms_fields": "",
    }, separators=(",", ": "))

# ─── Schema ──────────────────────────────────────────────────────────────────
SCHEMA_ENUM = """\
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_action') THEN
        CREATE TYPE sync_action AS ENUM ('UPSERT', 'DELETE', 'MERGE');
    END IF;
END $$
"""

SCHEMA_STANDARD = """\
CREATE TABLE IF NOT EXISTS sync_buffer (
    record_id            TEXT NOT NULL PRIMARY KEY,
    received_datetime    TIMESTAMP NOT NULL,
    integration_datetime TIMESTAMP,
    integration_error    TEXT,
    table_name           TEXT NOT NULL,
    action               sync_action NOT NULL,
    data                 TEXT NOT NULL,
    source_site_id       INTEGER
);
CREATE INDEX IF NOT EXISTS index_sync_buffer_action
    ON sync_buffer (action);
CREATE INDEX IF NOT EXISTS index_sync_buffer_combined_index
    ON sync_buffer (action, table_name, integration_datetime, source_site_id);
CREATE INDEX IF NOT EXISTS index_sync_buffer_integration_datetime
    ON sync_buffer (integration_datetime);
CREATE INDEX IF NOT EXISTS index_sync_buffer_integration_error
    ON sync_buffer (integration_error)
"""

SCHEMA_PARTITIONED = """\
DROP TABLE IF EXISTS sync_buffer_pt CASCADE;
CREATE TABLE sync_buffer_pt (
    record_id            TEXT NOT NULL,
    received_datetime    TIMESTAMP NOT NULL,
    is_integrated        BOOLEAN NOT NULL DEFAULT FALSE,
    integration_datetime TIMESTAMP,
    integration_error    TEXT,
    table_name           TEXT NOT NULL,
    action               sync_action NOT NULL,
    data                 TEXT NOT NULL,
    source_site_id       INTEGER,
    PRIMARY KEY (record_id, is_integrated)
) PARTITION BY LIST (is_integrated);
CREATE TABLE sync_buffer_pt_pending PARTITION OF sync_buffer_pt FOR VALUES IN (FALSE);
CREATE TABLE sync_buffer_pt_done    PARTITION OF sync_buffer_pt FOR VALUES IN (TRUE);
CREATE INDEX idx_pt_pending_combined
    ON sync_buffer_pt_pending (action, table_name, source_site_id);
CREATE INDEX idx_pt_done_combined
    ON sync_buffer_pt_done (action, table_name, integration_datetime, source_site_id)
"""

UPSERT_STD = (
    "INSERT INTO sync_buffer "
    "(record_id, received_datetime, integration_datetime, integration_error, "
    "table_name, action, data, source_site_id) "
    "VALUES (%s, '2025-06-01', NULL, NULL, %s, 'UPSERT', %s, %s) "
    "ON CONFLICT (record_id) DO UPDATE SET "
    "received_datetime=EXCLUDED.received_datetime, "
    "integration_datetime=EXCLUDED.integration_datetime, "
    "integration_error=EXCLUDED.integration_error, "
    "table_name=EXCLUDED.table_name, action=EXCLUDED.action, "
    "data=EXCLUDED.data, source_site_id=EXCLUDED.source_site_id"
)

# Delete-then-insert to avoid duplicate record_ids across partitions.
# The conflict key (record_id, is_integrated) won't match across partitions,
# so we delete any integrated row first.
UPSERT_PT = (
    "WITH moved AS ("
    "  DELETE FROM sync_buffer_pt"
    "  WHERE record_id = %s AND is_integrated = TRUE"
    "  RETURNING record_id"
    ") "
    "INSERT INTO sync_buffer_pt "
    "(record_id, received_datetime, is_integrated, integration_datetime, "
    "integration_error, table_name, action, data, source_site_id) "
    "VALUES (%s, '2025-06-01', FALSE, NULL, NULL, %s, 'UPSERT', %s, %s) "
    "ON CONFLICT (record_id, is_integrated) DO UPDATE SET "
    "received_datetime=EXCLUDED.received_datetime, "
    "integration_datetime=EXCLUDED.integration_datetime, "
    "integration_error=EXCLUDED.integration_error, "
    "table_name=EXCLUDED.table_name, action=EXCLUDED.action, "
    "data=EXCLUDED.data, source_site_id=EXCLUDED.source_site_id"
)

# ─── Populate operations ────────────────────────────────────────────────────
def populate_table(conn, table: str, n: int, integrated: bool, *,
                   extra_cols: str = "", extra_vals_fn=None, chunk_size: int = 500,
                   id_offset: int = 0):
    """Generic batch-insert into any table, committing per chunk."""
    integration_dt = "'2025-01-01 00:00:00'" if integrated else "NULL"
    prefix = "int" if integrated else "pending"
    cols = ("record_id, received_datetime, integration_datetime, integration_error, "
            "table_name, action, data, source_site_id")
    if extra_cols:
        cols += ", " + extra_cols

    for chunk_start in range(0, n, chunk_size):
        chunk_end = min(chunk_start + chunk_size, n)
        rows = []
        for i in range(chunk_start, chunk_end):
            idx = i + id_offset
            table_name = MOCK_TABLE_NAMES[idx % len(MOCK_TABLE_NAMES)]
            source_site = (idx % 10) + 1
            rid = f"{prefix}_{idx}"
            data = mock_trans_line_json(rid).replace("'", "''")
            val = (f"('{rid}', '2025-01-01 00:00:00', {integration_dt}, NULL, "
                   f"'{table_name}', 'UPSERT', '{data}', {source_site}")
            if extra_vals_fn:
                val += ", " + extra_vals_fn(integrated)
            val += ")"
            rows.append(val)
        with conn.cursor() as cur:
            cur.execute(f"INSERT INTO {table} ({cols}) VALUES {','.join(rows)}")
        conn.commit()

def populate(conn, table: str, n_integrated: int, n_pending: int, *,
             partitioned: bool = False, id_offset: int = 0):
    extra_cols = "is_integrated" if partitioned else ""
    extra_vals_fn = (lambda integ: "TRUE" if integ else "FALSE") if partitioned else None
    for integrated, n in ((True, n_integrated), (False, n_pending)):
        populate_table(conn, table, n, integrated,
                       extra_cols=extra_cols, extra_vals_fn=extra_vals_fn,
                       id_offset=id_offset)

# ─── Helpers ─────────────────────────────────────────────────────────────────
def readable_string(n: int) -> str:
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M" if n % 1_000_000 else f"{n // 1_000_000}M"
    if n >= 1_000:
        return f"{n/1_000:.1f}K" if n % 1_000 else f"{n // 1_000}K"
    return str(n)

def exec_sql(conn, sql: str):
    if conn.info.transaction_status != psycopg2.extensions.TRANSACTION_STATUS_IDLE:
        conn.rollback()
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()


# Global search_path to re-apply after any potential reset
_search_path_schema: str | None = None

def set_schema(conn, schema: str):
    """Set and remember the search_path."""
    global _search_path_schema
    _search_path_schema = schema
    exec_sql(conn, f"SET search_path TO {schema}")

def ensure_schema(conn):
    """Re-apply the search_path if one was set."""
    if _search_path_schema and _search_path_schema != "public":
        exec_sql(conn, f"SET search_path TO {_search_path_schema}")

def bench(fn) -> float:
    """Run fn, return elapsed milliseconds."""
    start = time.perf_counter()
    fn()
    return (time.perf_counter() - start) * 1000

def make_new_rows(n: int = 1000) -> list[tuple]:
    return [
        (f"new_{i}", MOCK_TABLE_NAMES[i % len(MOCK_TABLE_NAMES)],
         (i % 10) + 1, mock_trans_line_json(f"new_{i}"))
        for i in range(n)
    ]

# ─── Benchmark operations ────────────────────────────────────────────────────
def run(conn, approach: str, new_rows: list[tuple]) -> list[dict]:
    """Run benchmark operations against the current table state.
    Returns list of {operation, duration_ms} dicts."""
    results = []
    is_pt = approach == "partitioned"
    upsert_sql = UPSERT_PT if is_pt else UPSERT_STD
    table = "sync_buffer_pt" if is_pt else "sync_buffer"
    filter_col = "is_integrated = FALSE" if is_pt else "integration_datetime IS NULL"

    # Helper: partitioned SQL has an extra leading %s for the DELETE function
    def upsert_params(rid, tbl, data, src):
        if is_pt:
            return (rid, rid, tbl, data, src)
        return (rid, tbl, data, src)

    # 1. Upsert 1K new (in tx)
    def upsert_new():
        with conn.cursor() as cur:
            for rid, tbl, src, data in new_rows:
                cur.execute(upsert_sql, upsert_params(rid, tbl, data, src))
        conn.commit()
    results.append({"operation": "upsert_1k_new_tx", "duration_ms": bench(upsert_new)})

    # 2. Upsert 1K existing pending (in tx)
    def upsert_existing():
        with conn.cursor() as cur:
            for rid, tbl, src, data in new_rows:
                cur.execute(upsert_sql, upsert_params(rid, tbl, data, src))
        conn.commit()
    results.append({"operation": "upsert_1k_existing_tx", "duration_ms": bench(upsert_existing)})

    # Clean up new rows before queries
    with conn.cursor() as cur:
        cur.execute(f"DELETE FROM {table} WHERE record_id LIKE 'new_%'")
    conn.commit()

    # 2b. Upsert 100 already-integrated records via upsert
    int_rows = [
        (f"int_{i}", MOCK_TABLE_NAMES[i % len(MOCK_TABLE_NAMES)],
         (i % 10) + 1, mock_trans_line_json(f"int_{i}_resync"))
        for i in range(100)
    ]

    def upsert_integrated():
        with conn.cursor() as cur:
            for rid, tbl, src, data in int_rows:
                cur.execute(upsert_sql, upsert_params(rid, tbl, data, src))
        conn.commit()
    results.append({"operation": "upsert_100_integrated_tx", "duration_ms": bench(upsert_integrated)})

    # Restore integrated rows to their original state
    int_id_list = ",".join(f"'int_{i}'" for i in range(100))
    with conn.cursor() as cur:
        if is_pt:
            cur.execute(
                "UPDATE sync_buffer_pt SET is_integrated = TRUE, "
                "integration_datetime = '2025-01-01 00:00:00' "
                f"WHERE record_id IN ({int_id_list}) AND is_integrated = FALSE"
            )
        else:
            cur.execute(
                "UPDATE sync_buffer SET integration_datetime = '2025-01-01 00:00:00' "
                f"WHERE record_id IN ({int_id_list})"
            )
    conn.commit()

    # 3. Query unintegrated (filtered)
    def query_filtered():
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT * FROM {table} WHERE {filter_col} "
                f"AND action = 'UPSERT' AND table_name = 'transact' AND source_site_id = 1"
            )
            return cur.fetchall()
    r = None
    def query_filtered_capture():
        nonlocal r
        r = query_filtered()
    ms = bench(query_filtered_capture)
    results.append({"operation": "query_filtered", "duration_ms": ms,
                     "rows": len(r) if r else 0})

    # 4. Query unintegrated (all)
    def query_all():
        with conn.cursor() as cur:
            cur.execute(f"SELECT * FROM {table} WHERE {filter_col}")
            return cur.fetchall()
    r2 = None
    def query_all_capture():
        nonlocal r2
        r2 = query_all()
    ms = bench(query_all_capture)
    results.append({"operation": "query_all_unintegrated", "duration_ms": ms,
                     "rows": len(r2) if r2 else 0})

    # 5. Mark 100 integrated (in tx)
    with conn.cursor() as cur:
        for rid, tbl, src, data in new_rows[:100]:
            cur.execute(upsert_sql, upsert_params(rid, tbl, data, src))
    conn.commit()

    if is_pt:
        def mark_integrated():
            with conn.cursor() as cur:
                for rid, _tbl, _src, _data in new_rows[:100]:
                    cur.execute(
                        "UPDATE sync_buffer_pt SET is_integrated = TRUE, "
                        "integration_datetime = '2025-06-01 12:00:00' "
                        "WHERE record_id = %s AND is_integrated = FALSE", (rid,))
            conn.commit()
    else:
        def mark_integrated():
            with conn.cursor() as cur:
                for rid, tbl, src, data in new_rows[:100]:
                    cur.execute(
                        "INSERT INTO sync_buffer "
                        "(record_id, received_datetime, integration_datetime, integration_error, "
                        "table_name, action, data, source_site_id) "
                        "VALUES (%s, '2025-06-01', '2025-06-01 12:00:00', NULL, %s, 'UPSERT', %s, %s) "
                        "ON CONFLICT (record_id) DO UPDATE SET "
                        "received_datetime=EXCLUDED.received_datetime, "
                        "integration_datetime=EXCLUDED.integration_datetime, "
                        "integration_error=EXCLUDED.integration_error, "
                        "table_name=EXCLUDED.table_name, action=EXCLUDED.action, "
                        "data=EXCLUDED.data, source_site_id=EXCLUDED.source_site_id",
                        (rid, tbl, data, src))
            conn.commit()
    results.append({"operation": "mark_100_integrated_tx", "duration_ms": bench(mark_integrated)})

    # 6. Re-sync 100 integrated → pending via upsert path (in tx)
    def resync():
        with conn.cursor() as cur:
            for i in range(100):
                rid = f"new_{i}"
                tbl = MOCK_TABLE_NAMES[i % len(MOCK_TABLE_NAMES)]
                src = (i % 10) + 1
                data = mock_trans_line_json(f"resync_{i}")
                cur.execute(upsert_sql, upsert_params(rid, tbl, data, src))
        conn.commit()
    results.append({"operation": "resync_100_tx", "duration_ms": bench(resync)})

    # Clean up
    with conn.cursor() as cur:
        cur.execute(f"DELETE FROM {table} WHERE record_id LIKE 'new_%'")
    conn.commit()

    return results

# ─── Main benchmark loop ────────────────────────────────────────────────────
def bench_loop(conn, args):
    """Run the interval-based benchmark sweep."""
    approaches = ["standard", "partitioned"] if args.partitioned else ["standard"]
    new_rows = make_new_rows(1000)
    all_results = []

    # Ensure search_path is set
    ensure_schema(conn)

    # Create tables
    exec_sql(conn, SCHEMA_ENUM)
    exec_sql(conn, SCHEMA_STANDARD)
    if args.partitioned:
        exec_sql(conn, SCHEMA_PARTITIONED)

    test_points = []
    sizes = list(range(args.min, args.max + 1, args.interval))
    if args.max not in sizes:
        sizes.append(args.max)

    if args.pending_min is not None:
        for total in sizes:
            pending_sizes = list(range(args.pending_min,
                                       min(args.pending_max, total) + 1,
                                       args.pending_interval))
            if args.pending_max not in pending_sizes and args.pending_max <= total:
                pending_sizes.append(args.pending_max)
            for pending in pending_sizes:
                test_points.append((total, pending))
    else:
        # Default: pending = 1% of total
        for total in sizes:
            test_points.append((total, max(total // 100, 1)))

    print(f"Approaches: {approaches}", file=sys.stderr)
    print(file=sys.stderr)

    for point_idx, (total, pending) in enumerate(test_points, 1):
        integrated = total - pending
        print(f"[{point_idx}/{len(test_points)}] "
              f"total={readable_string(total)}, pending={readable_string(pending)}, "
              f"integrated={readable_string(integrated)}",
              file=sys.stderr, end="", flush=True)

        for approach in approaches:
            is_pt = approach == "partitioned"
            table = "sync_buffer_pt" if is_pt else "sync_buffer"

            # Re-apply search_path before each approach
            ensure_schema(conn)

            # Repopulate from scratch
            exec_sql(conn, f"TRUNCATE {table}")
            pop_start = time.perf_counter()
            populate(conn, table, integrated, pending, partitioned=is_pt)
            pop_secs = time.perf_counter() - pop_start

            print(f"  {approach}({pop_secs:.0f}s)", file=sys.stderr,
                  end="", flush=True)

            # Run operations
            results = run(conn, approach, new_rows)
            for r in results:
                row = {
                    "total_rows": total,
                    "pending_rows": pending,
                    "approach": approach,
                    "operation": r["operation"],
                    "duration_ms": round(r["duration_ms"], 2),
                }
                if "rows" in r:
                    row["result_rows"] = r["rows"]
                all_results.append(row)

        print(file=sys.stderr)  # newline after approaches

    # Cleanup
    if args.partitioned:
        exec_sql(conn, "DROP TABLE IF EXISTS sync_buffer_pt CASCADE")

    return all_results


# ─── CLI ─────────────────────────────────────────────────────────────────────
def parse_size(s: str) -> int:
    """Parse '1M', '500K', '1000000' etc."""
    s = s.strip().replace(",", "").replace("_", "")
    if s.upper().endswith("M"):
        return int(float(s[:-1]) * 1_000_000)
    if s.upper().endswith("K"):
        return int(float(s[:-1]) * 1_000)
    return int(s)


def main():
    parser = argparse.ArgumentParser(
        description="Sync buffer scaling benchmark for PostgreSQL",
    )
    parser.add_argument("--db", "--database-url",
                        default=os.environ.get("DATABASE_URL", ""),
                        help="PostgreSQL connection string (or set DATABASE_URL)")
    parser.add_argument("--schema", default="bench_sync_buffer",
                        help="Temp schema name (default: bench_sync_buffer). "
                             "Use 'public' for default schema.")
    parser.add_argument("--keep-schema", action="store_true")
    parser.add_argument("--min", type=parse_size, default=10_000,
                        help="Minimum total rows (default: 10K)")
    parser.add_argument("--max", type=parse_size, default=1_000_000,
                        help="Maximum total rows (default: 1M)")
    parser.add_argument("--interval", type=parse_size, default=1_000_000,
                        help="Step between total row counts (default: 1M)")
    parser.add_argument("--pending-min", type=parse_size, default=None,
                        help="Min pending rows (default: 1%% of total)")
    parser.add_argument("--pending-max", type=parse_size, default=None,
                        help="Max pending rows (default: 1%% of total)")
    parser.add_argument("--pending-interval", type=parse_size, default=None,
                        help="Step between pending counts")
    parser.add_argument("--partitioned", action="store_true",
                        help="Also benchmark native LIST partitioning")
    parser.add_argument("--csv", type=str, default="results.csv",
                        help="Write CSV to file (default: results.csv)")
    args = parser.parse_args()

    if not args.db:
        print("ERROR: No database connection string.", file=sys.stderr)
        print("  Set DATABASE_URL or pass --db 'postgresql://...'", file=sys.stderr)
        sys.exit(1)

    # Validate pending args: all-or-none
    pending_args = [args.pending_min, args.pending_max, args.pending_interval]
    if any(a is not None for a in pending_args):
        if args.pending_min is None or args.pending_max is None or args.pending_interval is None:
            print("ERROR: --pending-min, --pending-max, --pending-interval "
                  "must all be specified together.", file=sys.stderr)
            sys.exit(1)

    conn = psycopg2.connect(args.db)
    conn.autocommit = False

    use_temp_schema = args.schema != "public"
    if use_temp_schema:
        print(f"Using schema: {args.schema}", file=sys.stderr)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(f"DROP SCHEMA IF EXISTS {args.schema} CASCADE")
            cur.execute(f"CREATE SCHEMA {args.schema}")
        conn.autocommit = False
        set_schema(conn, args.schema)

    try:
        results = bench_loop(conn, args)

        # Write CSV
        if not results:
            print("No results.", file=sys.stderr)
            return

        fieldnames = ["total_rows", "pending_rows", "approach", "operation",
                      "duration_ms", "result_rows"]
        out = open(args.csv, "w", newline="") if args.csv else sys.stdout
        writer = csv.DictWriter(out, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)
        if args.csv:
            out.close()
            print(f"\nWrote {len(results)} rows to {args.csv}", file=sys.stderr)
        else:
            print(file=sys.stderr)  # blank line after CSV on stdout

    finally:
        if use_temp_schema and not args.keep_schema:
            conn.rollback()  # clear any failed transaction state
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(f"DROP SCHEMA IF EXISTS {args.schema} CASCADE")
            print(f"Cleaned up schema '{args.schema}'", file=sys.stderr)
        conn.close()


if __name__ == "__main__":
    main()
