#!/usr/bin/env python3
"""Run the V2-vs-legacy properties perf matrix against SQLite and/or
Postgres, keep every sample, and produce plots.

Mitigations for cache warmup skew:
  - First sample of every case is kept and reported separately (the
    "cold" sample); the remaining samples are the steady-state set.
  - A dedicated subplot shows first-sample-vs-steady-state ratio so
    you can eyeball whether warmup is dominating any case.

Plot caps at --cap milliseconds (default 200); bars that would exceed
that are clipped and overlaid with a striped pattern + the actual value
printed above so nothing is hidden.

Usage:
    pip install --user matplotlib numpy psycopg2-binary
    python3 server/scripts/perf_plot.py \\
        --sqlite /tmp/perf-seed-test.sqlite \\
        --postgres "postgresql://brian@localhost:5432/tmp" \\
        --iterations 20 \\
        --out /tmp/perf_plot.png
"""

import argparse
import sqlite3
import statistics
import subprocess
import sys
import time
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Tuple

import numpy as np  # noqa: F401  (matplotlib needs numpy on import)
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

try:
    import psycopg2  # type: ignore
    HAVE_PSYCOPG2 = True
except ImportError:
    HAVE_PSYCOPG2 = False


# -------------------------------------------------------------------- queries
#
# Query generation lives in perf_sql_test.py — we import it so both scripts
# share the same SQL (and any new field is added in exactly one place).
# `SORT_SHAPE` in perf_sql_test defaults to "leftjoin", which matches what
# this script was hard-wired to before the merge.

import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from perf_sql_test import (  # noqa: E402
    INDEXED_CASES,
    NESTED_FIELDS_DENSE,
    NESTED_FIELDS_SPARSE,
    SPARSE_FIELDS,
    applicable_methods,
    exec_postgres_ddl,
    exec_sqlite_ddl,
    has_sparse_postgres,
    has_sparse_sqlite,
    queries_postgres,
    queries_sqlite,
)


# -------------------------------------------------------------------- runners


class QueryTimeout(Exception):
    """Raised when a query exceeds the configured per-query timeout."""


def make_sqlite_runner(
    db_path: str, timeout_ms: float
) -> Callable[[str], Callable[[], None]]:
    """SQLite has no native statement timeout — we enforce one with a watcher
    thread that calls `conn.interrupt()` if the query is still running when
    the deadline hits. The interrupt raises a `sqlite3.OperationalError`
    which we re-raise as `QueryTimeout` so the sampler can record it."""
    import threading

    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL;")

    def runner(sql: str) -> Callable[[], None]:
        def run():
            timer = threading.Timer(timeout_ms / 1000.0, conn.interrupt)
            timer.start()
            try:
                cur = conn.cursor()
                cur.execute(sql)
                cur.fetchall()
                cur.close()
            except sqlite3.OperationalError as e:
                if "interrupted" in str(e).lower():
                    raise QueryTimeout()
                raise
            finally:
                timer.cancel()
        return run
    return runner


def make_psql_runner(
    conn_str: str, timeout_ms: float
) -> Callable[[str], Callable[[], None]]:
    """Persistent postgres session with `SET statement_timeout` so any single
    query past the limit comes back as an error rather than running to
    completion. Prefers psycopg2 (libpq via FFI — no per-query process spawn);
    falls back to a `psql` subprocess if psycopg2 isn't installed."""
    if HAVE_PSYCOPG2:
        return _make_psycopg2_runner(conn_str, timeout_ms)
    return _make_psql_subprocess_runner(conn_str, timeout_ms)


def _make_psycopg2_runner(
    conn_str: str, timeout_ms: float
) -> Callable[[str], Callable[[], None]]:
    conn = psycopg2.connect(conn_str)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(f"SET statement_timeout = {int(timeout_ms)}")
    cur.close()

    def runner(sql: str) -> Callable[[], None]:
        def run():
            cur = conn.cursor()
            try:
                cur.execute(sql)
                try:
                    cur.fetchall()
                except psycopg2.ProgrammingError:
                    # Statements with no result set (rare for our queries).
                    pass
            except psycopg2.errors.QueryCanceled:
                raise QueryTimeout()
            finally:
                cur.close()
        return run
    return runner


def _make_psql_subprocess_runner(
    conn_str: str, timeout_ms: float
) -> Callable[[str], Callable[[], None]]:
    proc = subprocess.Popen(
        ["psql", conn_str, "-A", "-t", "-q", "-X", "-v", "ON_ERROR_STOP=0"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=1,
        text=True,
    )
    SENTINEL = "__PERF_DONE__"

    # Cap to whole ms (Postgres rejects fractional ms strings in older
    # versions) and set up the session.
    proc.stdin.write(
        f"SET statement_timeout = '{int(timeout_ms)}ms';\n\\echo {SENTINEL}\n"
    )
    proc.stdin.flush()
    while True:
        line = proc.stdout.readline()
        if line.strip() == SENTINEL:
            break

    def runner(sql: str) -> Callable[[], None]:
        def run():
            if proc.poll() is not None:
                err = proc.stderr.read() if proc.stderr else ""
                raise RuntimeError(f"psql exited {proc.returncode}: {err[:400]}")
            proc.stdin.write(f"{sql};\n\\echo {SENTINEL}\n")
            proc.stdin.flush()
            saw_error = False
            error_msg = ""
            while True:
                line = proc.stdout.readline()
                if not line:
                    err = proc.stderr.read() if proc.stderr else ""
                    raise RuntimeError(f"psql closed stdout: {err[:400]}")
                if line.strip() == SENTINEL:
                    break
            # Drain any pending stderr to detect statement_timeout errors.
            # Use non-blocking read via os.read on the underlying fd.
            import os, select as _select
            if proc.stderr is not None:
                fd = proc.stderr.fileno()
                while True:
                    r, _, _ = _select.select([fd], [], [], 0)
                    if not r:
                        break
                    chunk = os.read(fd, 4096).decode("utf-8", "replace")
                    if not chunk:
                        break
                    error_msg += chunk
                    if "statement timeout" in chunk.lower():
                        saw_error = True
            if saw_error:
                raise QueryTimeout()
        return run
    return runner


# -------------------------------------------------------------------- sampler


@dataclass
class CaseSamples:
    backend: str
    op: str
    field: str
    method: str
    samples_ms: List[float] = field(default_factory=list)
    timed_out: bool = False  # any sample hit the configured query timeout

    @property
    def cold(self) -> Optional[float]:
        """First sample after the warmup (the script's first real timed run).

        The OS file cache state for tables/indexes is uncached the very first
        time, so the first sample carries the biggest warmup tax. Splitting it
        out lets us see whether the median is being skewed by warmup."""
        return self.samples_ms[0] if self.samples_ms else None

    @property
    def steady(self) -> List[float]:
        return self.samples_ms[1:]

    @property
    def median(self) -> Optional[float]:
        s = self.samples_ms
        return statistics.median(s) if s else None

    @property
    def steady_median(self) -> Optional[float]:
        s = self.steady
        return statistics.median(s) if s else None


def sample_case(
    run_once: Callable[[], None],
    iterations: int,
    do_warmup: bool,
    timeout_ms: float,
) -> Tuple[List[float], bool]:
    """Returns (samples_ms, timed_out). On the first timeout we bail and
    report; running more iterations of a known-slow case wastes wall clock."""
    if do_warmup:
        try:
            run_once()
        except QueryTimeout:
            # Warmup already overran the budget — record the timeout (using
            # the cap as the "value") so the plot still shows something.
            return [timeout_ms], True
    samples: List[float] = []
    for _ in range(iterations):
        start = time.perf_counter()
        try:
            run_once()
        except QueryTimeout:
            elapsed = (time.perf_counter() - start) * 1000.0
            # Record at-least-timeout latency so plotting has a value, then bail.
            samples.append(max(elapsed, timeout_ms))
            return samples, True
        samples.append((time.perf_counter() - start) * 1000.0)
    return samples, False


METHODS = ["legacy", "legacyJsonb", "v2", "indexed"]
# Populated by main() — starts with the dense set + nested-dense; sparse +
# nested-sparse fields are appended only when the sparse-properties seed has
# actually been run.
FIELDS: List[str] = ["text", "number", "option", "date"] + NESTED_FIELDS_DENSE
OPS = ["filter", "sort"]


def collect(
    label: str,
    gen_queries,
    make_runner,
    iterations: int,
    limit: int,
    do_warmup: bool,
    timeout_ms: float,
) -> Dict[str, CaseSamples]:
    """Returns dict keyed by f'{op}_{field}_{method}'."""
    print(
        f"\n=== {label} (iters={iterations}, warmup={'yes' if do_warmup else 'no'}, "
        f"timeout={timeout_ms:.0f}ms) ==="
    )
    results: Dict[str, CaseSamples] = {}
    for field in FIELDS:
        # Nested fields skip V2 (V2 has no nested model); applicable_methods
        # returns just the legacy paths for those cases.
        for method in applicable_methods(field):
            f_sql, s_sql = gen_queries(field, method, limit)
            for op, sql in (("filter", f_sql), ("sort", s_sql)):
                runner = make_runner(sql)
                try:
                    samples, timed_out = sample_case(
                        runner, iterations, do_warmup, timeout_ms
                    )
                except Exception as e:
                    print(f"  {op:6} {field:24} {method:11} ERROR: {e}")
                    results[f"{op}_{field}_{method}"] = CaseSamples(
                        label, op, field, method
                    )
                    continue
                cs = CaseSamples(label, op, field, method, samples, timed_out)
                results[f"{op}_{field}_{method}"] = cs
                cold = samples[0] if samples else 0.0
                steady = (
                    statistics.median(samples[1:]) if len(samples) > 1 else cold
                )
                marker = "  TIMEOUT" if timed_out else ""
                print(
                    f"  {op:6} {field:24} {method:11} "
                    f"cold {cold:7.2f}ms  steady-median {steady:7.2f}ms  "
                    f"min {min(samples) if samples else 0:7.2f}  "
                    f"max {max(samples) if samples else 0:7.2f}{marker}"
                )
    return results


def collect_indexed_pass(
    backend: str,
    target,
    label: str,
    gen_queries,
    make_runner,
    iterations: int,
    limit: int,
    do_warmup: bool,
    timeout_ms: float,
    results: Dict[str, CaseSamples],
) -> None:
    """For each INDEXED_CASES entry: CREATE the functional index, time the
    legacyJsonb queries (the planner will use the index automatically),
    store results under method='indexed', then DROP. Merges into the same
    results dict the main collect() produced so plotting picks them up as
    the 4th method. `target` is the sqlite path or postgres conn string."""
    print(f"\n=== {label} — indexed pass ===")
    for case in INDEXED_CASES:
        field = case["field"]
        if field not in FIELDS:
            continue
        idx_name = case["index_name"]
        expr = case["sqlite_expr"] if backend == "sqlite" else case["postgres_expr"]
        ddl_create = f"CREATE INDEX IF NOT EXISTS {idx_name} ON name ({expr})"
        ddl_drop = f"DROP INDEX IF EXISTS {idx_name}"
        if backend == "sqlite":
            exec_sqlite_ddl(target, ddl_create)
            exec_sqlite_ddl(target, "ANALYZE name")
        else:
            exec_postgres_ddl(target, ddl_create)
            exec_postgres_ddl(target, "ANALYZE name")
        try:
            f_sql, s_sql = gen_queries(field, "legacyJsonb", limit)
            for op, sql in (("filter", f_sql), ("sort", s_sql)):
                runner = make_runner(sql)
                try:
                    samples, timed_out = sample_case(
                        runner, iterations, do_warmup, timeout_ms
                    )
                except Exception as e:
                    print(f"  {op:6} {field:24} indexed     ERROR: {e}")
                    results[f"{op}_{field}_indexed"] = CaseSamples(
                        label, op, field, "indexed"
                    )
                    continue
                cs = CaseSamples(label, op, field, "indexed", samples, timed_out)
                results[f"{op}_{field}_indexed"] = cs
                cold = samples[0] if samples else 0.0
                steady = (
                    statistics.median(samples[1:]) if len(samples) > 1 else cold
                )
                marker = "  TIMEOUT" if timed_out else ""
                print(
                    f"  {op:6} {field:24} indexed     "
                    f"cold {cold:7.2f}ms  steady-median {steady:7.2f}ms  "
                    f"min {min(samples) if samples else 0:7.2f}  "
                    f"max {max(samples) if samples else 0:7.2f}{marker}"
                )
        finally:
            # Always drop so the next run starts from the same unindexed
            # baseline as the main matrix.
            if backend == "sqlite":
                exec_sqlite_ddl(target, ddl_drop)
            else:
                exec_postgres_ddl(target, ddl_drop)


# -------------------------------------------------------------------- plotting


METHOD_COLORS = {
    "legacy": "#bfa15a",       # legacy text JSON
    "legacyJsonb": "#5aa5bf",  # JSONB twin
    "v2": "#7fbf6e",            # V2 relational
    "indexed": "#9a6bbf",      # JSONB + functional index over the extract
}
METHOD_LABEL = {
    "legacy": "legacy (text JSON)",
    "legacyJsonb": "legacy (JSONB)",
    "v2": "V2 relational",
    "indexed": "JSONB + index",
}


def _draw_bars(ax, results: Dict[str, CaseSamples], op: str, cap_ms: float):
    """Grouped bars per field, hue per method. If any bar's median exceeds
    `cap_ms`, the y-axis is capped at `cap_ms`, the overflowing bars are
    striped + annotated with the real value, and a red guide line is drawn.

    Sub-millisecond bars are drawn at a minimum height (`min_visible`) so
    indexed / V2 cases stay visible alongside 250ms legacy bars; the real
    value is annotated above any bar that got bumped up to the minimum."""
    n_fields = len(FIELDS)
    n_methods = len(METHODS)
    bar_w = 0.8 / n_methods
    x = np.arange(n_fields)

    # First pass — collect all medians/whiskers so we know whether to clip.
    # cells[j][i] = (med, lo, hi, timed_out)
    cells: List[List[Tuple[float, float, float, bool]]] = []
    any_overflow = False
    for j, method in enumerate(METHODS):
        row: List[Tuple[float, float, float, bool]] = []
        for fld in FIELDS:
            cs = results.get(f"{op}_{fld}_{method}")
            if cs is None or not cs.samples_ms:
                row.append((0.0, 0.0, 0.0, False))
                continue
            steady = cs.steady or cs.samples_ms
            med = statistics.median(steady)
            lo = min(steady)
            hi = max(steady)
            row.append((med, lo, hi, cs.timed_out))
            if med > cap_ms or cs.timed_out:
                any_overflow = True
        cells.append(row)

    y_limit = cap_ms if any_overflow else None  # None = matplotlib autoscale
    y_top = cap_ms if y_limit is not None else max(
        (m for r in cells for m, *_ in r if m > 0), default=1.0
    )
    # 3% of the visible range so sub-ms bars get a stub the eye can find,
    # but bars in the working range aren't visibly inflated.
    min_visible = y_top * 0.03

    for j, method in enumerate(METHODS):
        meds_lo_hi = cells[j]
        # Bars with real data smaller than `min_visible` get bumped up to it;
        # the real value is annotated above. Bars at exactly 0 (no data) stay
        # at 0 and are skipped below.
        drawn_heights = [
            min(m, cap_ms) if any_overflow else m
            for m, _, _, _ in meds_lo_hi
        ]
        drawn_heights = [
            max(h, min_visible) if h > 0 else 0.0 for h in drawn_heights
        ]
        offs = -0.4 + bar_w / 2 + j * bar_w
        bars = ax.bar(
            x + offs,
            drawn_heights,
            bar_w * 0.9,
            color=METHOD_COLORS[method],
            edgecolor="black",
            linewidth=0.4,
            label=METHOD_LABEL[method],
        )
        for i, bar in enumerate(bars):
            med, lo, hi, timed_out = meds_lo_hi[i]
            if med == 0 and not timed_out:
                continue
            cx = bar.get_x() + bar.get_width() / 2
            lo_draw = min(lo, cap_ms) if any_overflow else lo
            hi_draw = min(hi, cap_ms) if any_overflow else hi
            if not timed_out:
                ax.plot([cx, cx], [lo_draw, hi_draw], color="black", linewidth=0.7)
                ax.plot(
                    [cx - bar_w * 0.15, cx + bar_w * 0.15],
                    [lo_draw, lo_draw],
                    color="black",
                    linewidth=0.7,
                )
                ax.plot(
                    [cx - bar_w * 0.15, cx + bar_w * 0.15],
                    [hi_draw, hi_draw],
                    color="black",
                    linewidth=0.7,
                )
            if any_overflow and (med > cap_ms or timed_out):
                bar.set_hatch("///")
                # Timeouts get a distinct label so they're not confused with
                # bars that merely overran the plot cap.
                label = ">timeout" if timed_out else f"{med:.0f}ms"
                ax.annotate(
                    label,
                    xy=(cx, cap_ms),
                    xytext=(0, 4),
                    textcoords="offset points",
                    ha="center",
                    fontsize=7,
                    color="black",
                )
            elif med < min_visible:
                # Real value is small enough that we had to bump the bar up
                # to a visible stub; print the actual number above it.
                # Rotated so adjacent sub-ms bars don't overlap horizontally.
                ax.annotate(
                    f"{med:.2f}ms" if med >= 0.1 else f"{med * 1000:.0f}µs",
                    xy=(cx, min_visible),
                    xytext=(0, 4),
                    textcoords="offset points",
                    ha="left",
                    va="bottom",
                    rotation=45,
                    fontsize=6,
                    color="black",
                )

    ax.set_xticks(x)
    # Rotate so the longer `*_sparse` labels don't pile on top of each other.
    ax.set_xticklabels(FIELDS, rotation=25, ha="right")
    if y_limit is not None:
        ax.set_ylim(0, y_limit * 1.08)
        ax.axhline(y_limit, color="red", linestyle=":", linewidth=0.8, alpha=0.5)
    else:
        ax.set_ylim(bottom=0)
    ax.set_ylabel("median latency (ms)")
    ax.grid(axis="y", linestyle=":", alpha=0.35)


def plot_latency(
    by_backend: Dict[str, Dict[str, CaseSamples]],
    cap_ms: float,
    out_path: str,
):
    backends = list(by_backend.keys())
    n_cols = len(backends)
    # Width per subplot grows with the field count — at 3 dense fields the
    # original 5.5" was fine, but with 8 (dense + sparse) the bars overlap
    # unless we give them more room.
    col_w = max(5.5, 0.9 * len(FIELDS) + 2.0)
    fig, axes = plt.subplots(
        nrows=2, ncols=n_cols, figsize=(col_w * n_cols, 7.5), squeeze=False
    )
    # Scan once so the shared legend only mentions clipping if any subplot
    # actually had to clip (overflow or timeout).
    any_clipping = False
    for results in by_backend.values():
        for cs in results.values():
            if not cs.samples_ms:
                continue
            steady = cs.steady or cs.samples_ms
            if statistics.median(steady) > cap_ms or cs.timed_out:
                any_clipping = True
                break
        if any_clipping:
            break

    for col, backend in enumerate(backends):
        results = by_backend[backend]
        for row, op in enumerate(OPS):
            ax = axes[row][col]
            _draw_bars(ax, results, op, cap_ms)
            ax.set_title(f"{backend} — {op}")
    # Shared legend.
    handles = [Patch(facecolor=METHOD_COLORS[m], label=METHOD_LABEL[m]) for m in METHODS]
    if any_clipping:
        handles.append(
            Patch(facecolor="white", edgecolor="black", hatch="///",
                  label=f"> {cap_ms:.0f}ms (clipped)")
        )
    fig.legend(handles=handles, loc="upper center",
               ncol=len(handles), bbox_to_anchor=(0.5, 1.02))
    fig.suptitle(
        f"V2 vs legacy properties — filter & sort latency  (whisker = min/max of steady-state samples)",
        y=1.05,
    )
    plt.tight_layout()
    plt.savefig(out_path, dpi=140, bbox_inches="tight")
    print(f"\nWrote {out_path}")


def plot_warmup(
    by_backend: Dict[str, Dict[str, CaseSamples]],
    out_path: str,
):
    """For each case, plot cold-sample / steady-median ratio so any cold-cache
    skew jumps out. Ratio == 1 → no warmup penalty; >> 1 → first sample much
    slower than steady-state."""
    backends = list(by_backend.keys())
    col_w = max(5.5, 0.9 * len(FIELDS) + 2.0)
    fig, axes = plt.subplots(
        nrows=2, ncols=len(backends), figsize=(col_w * len(backends), 7.5), squeeze=False
    )
    for col, backend in enumerate(backends):
        results = by_backend[backend]
        for row, op in enumerate(OPS):
            ax = axes[row][col]
            x = np.arange(len(FIELDS))
            bar_w = 0.8 / len(METHODS)
            for j, method in enumerate(METHODS):
                ratios = []
                for f in FIELDS:
                    cs = results.get(f"{op}_{f}_{method}")
                    if cs is None or not cs.samples_ms or len(cs.samples_ms) < 2:
                        ratios.append(0.0)
                        continue
                    cold = cs.cold
                    steady = statistics.median(cs.steady)
                    ratios.append(cold / steady if steady > 0 else 0.0)
                offs = -0.4 + bar_w / 2 + j * bar_w
                ax.bar(
                    x + offs,
                    ratios,
                    bar_w * 0.9,
                    color=METHOD_COLORS[method],
                    edgecolor="black",
                    linewidth=0.4,
                    label=METHOD_LABEL[method] if (row == 0 and col == 0) else None,
                )
            ax.axhline(1.0, color="black", linewidth=0.7)
            ax.set_xticks(x)
            ax.set_xticklabels(FIELDS, rotation=25, ha="right")
            ax.set_ylabel("first-sample / steady-median")
            ax.set_title(f"{backend} — {op} warmup ratio")
            ax.grid(axis="y", linestyle=":", alpha=0.35)
    handles = [Patch(facecolor=METHOD_COLORS[m], label=METHOD_LABEL[m]) for m in METHODS]
    fig.legend(handles=handles, loc="upper center", ncol=3, bbox_to_anchor=(0.5, 1.02))
    fig.suptitle("Cold-sample skew (1.0 = no warmup tax)", y=1.05)
    plt.tight_layout()
    plt.savefig(out_path, dpi=140, bbox_inches="tight")
    print(f"Wrote {out_path}")


# -------------------------------------------------------------------- main


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--sqlite", help="Path to SQLite DB file")
    ap.add_argument("--postgres", help="Postgres conn string")
    ap.add_argument("--iterations", type=int, default=20)
    ap.add_argument("--limit", type=int, default=50)
    ap.add_argument(
        "--cap",
        type=float,
        default=200.0,
        help="Y-axis cap in ms; bars over this are clipped + striped. "
        "Below the cap matplotlib autoscales and no guide line is drawn.",
    )
    ap.add_argument(
        "--out",
        default="/tmp/perf_plot.png",
        help="Output path for the latency plot. A '_warmup' sibling is also written.",
    )
    ap.add_argument(
        "--no-warmup",
        action="store_true",
        help="Skip the dedicated warmup query so the first sample reflects "
        "fully cold (in-process) cache. Default keeps a warmup so the median "
        "isn't skewed.",
    )
    ap.add_argument(
        "--query-timeout",
        type=float,
        default=None,
        help="Per-query timeout in ms (sqlite via interrupt, postgres via "
        "statement_timeout). Defaults to 4 × --cap so genuinely slow cases "
        "show up as 'TIMEOUT' bars without blowing the wall clock.",
    )
    args = ap.parse_args()
    if args.query_timeout is None:
        args.query_timeout = args.cap * 4
    if not args.sqlite and not args.postgres:
        ap.error("specify --sqlite and/or --postgres")

    # Append sparse cases iff the sparse-properties seed has been applied to
    # every backend we're about to run. Mixed state (one backend seeded, the
    # other not) skips sparse — the plots share an x-axis per row and we'd
    # otherwise compare apples-to-oranges across columns.
    sparse_states = []
    if args.sqlite:
        sparse_states.append(has_sparse_sqlite(args.sqlite))
    if args.postgres:
        sparse_states.append(has_sparse_postgres(args.postgres))
    if sparse_states and all(sparse_states):
        FIELDS.extend(SPARSE_FIELDS)
        FIELDS.extend(NESTED_FIELDS_SPARSE)
        print(f"Sparse seed detected — including {SPARSE_FIELDS + NESTED_FIELDS_SPARSE}")
    elif any(sparse_states):
        print(
            "Sparse seed present in only some backends — skipping sparse "
            "cases so the per-backend plots stay comparable."
        )
    else:
        print("No sparse seed — skipping *_sparse cases.")

    by_backend: Dict[str, Dict[str, CaseSamples]] = {}

    if args.sqlite:
        runner = make_sqlite_runner(args.sqlite, args.query_timeout)
        by_backend["sqlite"] = collect(
            f"sqlite ({args.sqlite})",
            queries_sqlite,
            runner,
            args.iterations,
            args.limit,
            do_warmup=not args.no_warmup,
            timeout_ms=args.query_timeout,
        )
        collect_indexed_pass(
            "sqlite", args.sqlite, f"sqlite ({args.sqlite})",
            queries_sqlite, runner,
            args.iterations, args.limit,
            do_warmup=not args.no_warmup,
            timeout_ms=args.query_timeout,
            results=by_backend["sqlite"],
        )

    if args.postgres:
        runner = make_psql_runner(args.postgres, args.query_timeout)
        by_backend["postgres"] = collect(
            "postgres",
            queries_postgres,
            runner,
            args.iterations,
            args.limit,
            do_warmup=not args.no_warmup,
            timeout_ms=args.query_timeout,
        )
        collect_indexed_pass(
            "postgres", args.postgres, "postgres",
            queries_postgres, runner,
            args.iterations, args.limit,
            do_warmup=not args.no_warmup,
            timeout_ms=args.query_timeout,
            results=by_backend["postgres"],
        )

    plot_latency(by_backend, cap_ms=args.cap, out_path=args.out)
    warmup_out = args.out.rsplit(".", 1)
    warmup_out = warmup_out[0] + "_warmup." + (warmup_out[1] if len(warmup_out) > 1 else "png")
    plot_warmup(by_backend, out_path=warmup_out)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
