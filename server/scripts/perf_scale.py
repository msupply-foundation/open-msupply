#!/usr/bin/env python3
"""Scaling sweep for the properties KDD perf comparison.

Runs the legacy / legacyJsonb / V2 matrix at multiple dataset sizes and
produces a scaling curve. Unlike `perf_sql_test.py` which assumes a
pre-seeded DB at a single fixed size, this script owns the full lifecycle:
clean → seed dense → seed sparse → run matrix → repeat for the next size.

Usage:
    python3 server/scripts/perf_scale.py --sqlite /tmp/perf-scale.sqlite
    python3 server/scripts/perf_scale.py --postgres "postgresql://..." \\
        --sizes 1000,10000,100000,300000,1000000

Outputs:
  - Per-size summary tables on stdout (same shape as perf_sql_test.py).
  - CSV at --csv-out (default /tmp/perf_scale.csv) with one row per
    (backend, size, op, field, method).
  - PNG plot at --plot-out (default /tmp/perf_scale.png), grid of
    subplots (rows=op, cols=field) with one line per method on log-log axes.

Heads-up: at N=1,000,000 with sparse, total seed time can run 20–40 min per
backend and `property_v2_value` grows to ~30M rows. Plan accordingly.
"""

import argparse
import csv
import os
import sys
import time
from typing import Dict, List, Optional, Tuple

# All shared helpers — seed/cleanup, runners with SIGINT tracking, timer —
# live in perf_sql_test.py so they aren't duplicated. Only the sweep loop
# and CSV/plot output are owned by this script.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from perf_sql_test import (  # noqa: E402
    INDEXED_CASES,
    SPARSE_FIELDS,
    applicable_methods,
    cleanup_postgres,
    cleanup_sqlite,
    exec_postgres_ddl,
    exec_sqlite_ddl,
    install_sigint_handler,
    load_seed_sql,
    make_psql_runner,
    make_sqlite_runner,
    queries_postgres,
    queries_sqlite,
    run_sql_postgres,
    run_sql_sqlite,
    SEED_DENSE_POSTGRES,
    SEED_DENSE_SQLITE,
    SEED_SPARSE_POSTGRES,
    SEED_SPARSE_SQLITE,
    time_query_budgeted,
)


# -- Sweep -------------------------------------------------------------------


def fmt(ms: Optional[float]) -> str:
    if ms is None:
        return "    —"
    return f"{ms:6.1f}ms"


def parse_sizes(s: str) -> List[int]:
    sizes = [int(x.strip()) for x in s.split(",") if x.strip()]
    if not sizes:
        raise argparse.ArgumentTypeError("at least one size required")
    if any(n <= 0 for n in sizes):
        raise argparse.ArgumentTypeError("sizes must be positive")
    return sizes


CSV_FIELDNAMES = [
    "backend", "size", "op", "field", "method",
    "median_ms", "p95_ms",
    "cleanup_ms", "seed_ms_dense", "seed_ms_sparse",
]


def _open_incremental_csv(path: str):
    """Open the CSV in write mode and emit the header. Returned dict-writer
    is flushed after every append so a SIGKILL / crash can't strand data in
    OS buffers."""
    f = open(path, "w", newline="")
    w = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
    w.writeheader()
    f.flush()
    return f, w


def run_sweep(
    backend: str,
    target: str,
    sizes: List[int],
    iterations: int,
    limit: int,
    sort_shape: str,
    skip_sparse: bool,
    skip_indexed: bool,
    budget_ms: float,
    csv_writer=None,
    csv_file=None,
) -> List[Dict]:
    """Returns one dict per (size, op, field, method) measurement."""
    # `perf_sql_test.SORT_SHAPE` is a module-level global the query
    # generators read. Mirror what main() does there.
    import perf_sql_test
    perf_sql_test.SORT_SHAPE = sort_shape

    if backend == "sqlite":
        gen_queries = queries_sqlite
        run_sql = run_sql_sqlite
        cleanup = cleanup_sqlite
        exec_ddl = exec_sqlite_ddl
        seed_dense_file = SEED_DENSE_SQLITE
        seed_sparse_file = SEED_SPARSE_SQLITE
        make_runner = make_sqlite_runner
    else:
        gen_queries = queries_postgres
        run_sql = run_sql_postgres
        cleanup = cleanup_postgres
        exec_ddl = exec_postgres_ddl
        seed_dense_file = SEED_DENSE_POSTGRES
        seed_sparse_file = SEED_SPARSE_POSTGRES
        make_runner = make_psql_runner

    rows: List[Dict] = []
    dense_fields = ["text", "number", "option", "date"]
    sparse_fields = list(SPARSE_FIELDS) if not skip_sparse else []

    for size in sizes:
        print(f"\n=== {backend} N={size:,} ===")

        print(f"[{backend} N={size:,}] cleanup …", flush=True)
        t0 = time.perf_counter()
        cleanup(target)
        cleanup_ms = (time.perf_counter() - t0) * 1000.0
        print(f"[{backend} N={size:,}] cleanup done in {cleanup_ms/1000:.1f}s")

        print(f"[{backend} N={size:,}] seed dense …", flush=True)
        t0 = time.perf_counter()
        run_sql(target, load_seed_sql(seed_dense_file, size))
        seed_dense_ms = (time.perf_counter() - t0) * 1000.0
        print(f"[{backend} N={size:,}] seed dense done in {seed_dense_ms/1000:.1f}s")

        seed_sparse_ms = 0.0
        if not skip_sparse:
            print(f"[{backend} N={size:,}] seed sparse …", flush=True)
            t0 = time.perf_counter()
            run_sql(target, load_seed_sql(seed_sparse_file, None))
            seed_sparse_ms = (time.perf_counter() - t0) * 1000.0
            print(f"[{backend} N={size:,}] seed sparse done in {seed_sparse_ms/1000:.1f}s")

        runner_make, runner_close = make_runner(target)
        try:
            fields = dense_fields + sparse_fields
            results: Dict[str, Dict[str, Dict[str, Optional[Tuple[float, float]]]]] = {
                "filter": {f: {} for f in fields},
                "sort":   {f: {} for f in fields},
            }

            for field in fields:
                for method in applicable_methods(field):
                    if method not in ("legacy", "legacyJsonb", "v2"):
                        continue
                    try:
                        f_sql, s_sql = gen_queries(field, method, limit)
                    except Exception as e:
                        print(f"  query-gen ERROR {field}/{method}: {e}")
                        continue
                    for op, sql in (("filter", f_sql), ("sort", s_sql)):
                        label = f"  {op:6} {field:24} {method:11}"
                        try:
                            med, p95, n = time_query_budgeted(
                                runner_make(sql), iterations, budget_ms,
                            )
                            results[op][field][method] = (med, p95)
                            print(f"{label} ... median {fmt(med)}  p95 {fmt(p95)}  n={n}")
                        except Exception as e:
                            results[op][field][method] = None
                            print(f"{label} ... ERROR: {e}")

            if not skip_indexed:
                print(f"\n[{backend} N={size:,}] indexed pass")
                for case in INDEXED_CASES:
                    field = case["field"]
                    if field not in results["filter"]:
                        continue
                    indexes = case["sqlite_indexes" if backend == "sqlite" else "postgres_indexes"]
                    for idx_name, expr in indexes:
                        exec_ddl(target, f"CREATE INDEX IF NOT EXISTS {idx_name} ON name ({expr})")
                    exec_ddl(target, "ANALYZE name")
                    try:
                        f_sql, s_sql = gen_queries(field, "legacyJsonb", limit)
                        for op, sql in (("filter", f_sql), ("sort", s_sql)):
                            label = f"  {op:6} {field:24} indexed    "
                            try:
                                med, p95, n = time_query_budgeted(
                                    runner_make(sql), iterations, budget_ms,
                                )
                                results[op][field]["indexed"] = (med, p95)
                                print(f"{label} ... median {fmt(med)}  p95 {fmt(p95)}  n={n}")
                            except Exception as e:
                                results[op][field]["indexed"] = None
                                print(f"{label} ... ERROR: {e}")
                    finally:
                        for idx_name, _ in indexes:
                            exec_ddl(target, f"DROP INDEX IF EXISTS {idx_name}")

            # Summary tables for this size, same shape as perf_sql_test.
            print()
            method_cols = ["legacy", "legacyJsonb", "v2", "indexed"]
            for op in ("filter", "sort"):
                print(f"-- {op.upper()} median ({backend}, N={size:,}) --")
                header = f"{'field':<24}" + "".join(f"{m:>12}" for m in method_cols)
                print(header)
                for field in fields:
                    cells = []
                    for m in method_cols:
                        v = results[op][field].get(m)
                        cells.append(fmt(v[0]) if v else "    —")
                    print(f"{field:<24}" + "".join(f"{c:>12}" for c in cells))
                print()

            size_rows: List[Dict] = []
            for op in ("filter", "sort"):
                for field in fields:
                    for m in ("legacy", "legacyJsonb", "v2", "indexed"):
                        v = results[op][field].get(m)
                        if v is None:
                            continue
                        size_rows.append({
                            "backend": backend,
                            "size": size,
                            "op": op,
                            "field": field,
                            "method": m,
                            "median_ms": v[0],
                            "p95_ms": v[1],
                            "cleanup_ms": cleanup_ms,
                            "seed_ms_dense": seed_dense_ms,
                            "seed_ms_sparse": seed_sparse_ms,
                        })
            rows.extend(size_rows)
            if csv_writer is not None:
                # Flush after each size so a crash mid-sweep never loses
                # a completed size's results.
                for r in size_rows:
                    csv_writer.writerow(r)
                if csv_file is not None:
                    csv_file.flush()
        finally:
            runner_close()

    return rows


# -- Output ------------------------------------------------------------------


def write_csv(rows: List[Dict], path: str) -> None:
    """Write the full result set in one go. Used only when incremental
    writing is disabled — normal runs flush per-size via `run_sweep`."""
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print(f"wrote CSV: {path}")


# Plotting lives in perf_scale_plot.py so it can be re-run standalone against
# a CSV without redoing the sweep. Import lazily so a missing matplotlib
# doesn't break the no-plot path.
def write_plot(rows: List[Dict], path: str) -> None:
    try:
        from perf_scale_plot import render
    except ImportError as e:
        print(f"could not import perf_scale_plot: {e}")
        return
    render(rows, path)


# -- Main --------------------------------------------------------------------


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--sqlite", help="Path to SQLite DB file")
    ap.add_argument("--postgres", help="Postgres conn string")
    ap.add_argument(
        "--sizes", type=parse_sizes,
        default=parse_sizes("1000,10000,100000,300000,1000000"),
        help="Comma-separated store counts (default: 1000,10000,100000,300000,1000000)",
    )
    ap.add_argument("--iterations", type=int, default=10)
    ap.add_argument("--limit", type=int, default=50)
    ap.add_argument(
        "--per-case-budget-ms", type=float, default=1500.0,
        help="Soft time budget per query case (default 1500ms). The warmup "
        "sample is measured; the number of timed samples is then "
        "min(--iterations, floor(budget / warmup_ms)), floored at 1. Slow "
        "cases gracefully degrade rather than blowing the wall-clock budget.",
    )
    ap.add_argument(
        "--sort-shape", choices=["leftjoin", "correlated"], default="leftjoin",
    )
    ap.add_argument("--skip-sparse", action="store_true")
    ap.add_argument("--skip-indexed", action="store_true")
    ap.add_argument("--csv-out", default="/tmp/perf_scale.csv")
    ap.add_argument("--plot-out", default="/tmp/perf_scale.png")
    args = ap.parse_args()

    if not args.sqlite and not args.postgres:
        ap.error("specify --sqlite and/or --postgres")

    install_sigint_handler()

    print(f"Sizes:      {', '.join(f'{n:,}' for n in args.sizes)}")
    print(f"Iterations: {args.iterations} (+1 warmup)   LIMIT: {args.limit}")
    print(f"V2 sort:    {args.sort_shape}")
    print(f"Sparse:     {'skipped' if args.skip_sparse else 'included'}")
    print(f"Indexed:    {'skipped' if args.skip_indexed else 'included'}")
    if max(args.sizes) >= 500_000:
        print("WARNING: sizes >= 500k will take a long time (10+ min/size on "
              "Postgres with sparse). Use --skip-sparse for a quick pass.")

    # Open the CSV up-front and have `run_sweep` flush after each size, so
    # a crash mid-sweep (e.g. Postgres after a successful SQLite pass) can
    # never lose completed measurements.
    csv_file, csv_writer = _open_incremental_csv(args.csv_out)
    print(f"streaming CSV → {args.csv_out}")

    all_rows: List[Dict] = []
    try:
        if args.sqlite:
            all_rows.extend(run_sweep(
                "sqlite", args.sqlite, args.sizes, args.iterations, args.limit,
                args.sort_shape, args.skip_sparse, args.skip_indexed,
                args.per_case_budget_ms,
                csv_writer=csv_writer, csv_file=csv_file,
            ))
        if args.postgres:
            all_rows.extend(run_sweep(
                "postgres", args.postgres, args.sizes, args.iterations, args.limit,
                args.sort_shape, args.skip_sparse, args.skip_indexed,
                args.per_case_budget_ms,
                csv_writer=csv_writer, csv_file=csv_file,
            ))
    finally:
        csv_file.close()
        print(f"wrote CSV: {args.csv_out}")

    write_plot(all_rows, args.plot_out)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
