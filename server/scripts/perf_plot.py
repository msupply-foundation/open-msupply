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

TEXT_LIKE = "%store 7%"
NUM_MIN, NUM_MAX = 40, 60
OPTION_TEXT = "Navy"
OPTION_ID = "perf_opt_bean_navy"

LEGACY_KEY = {"text": "beans_thoughts", "number": "beans_count", "option": "favourite_bean"}
V2_ID = {
    "text": "perf_propv2_beans_thoughts",
    "number": "perf_propv2_beans_count",
    "option": "perf_propv2_favourite_bean",
}


def queries_sqlite(field: str, method: str, limit: int) -> Tuple[str, str]:
    if method in ("legacy", "legacyJsonb"):
        col = "properties_jsonb" if method == "legacyJsonb" else "properties"
        extract = f"json_extract(name.{col}, '$.{LEGACY_KEY[field]}')"
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
        else:
            f_sql = (
                f"SELECT count(*) FROM (SELECT name.id FROM name "
                f"WHERE {extract} = '{OPTION_TEXT}' LIMIT {limit})"
            )
        s_sql = (
            f"SELECT count(*) FROM (SELECT name.id FROM name "
            f"ORDER BY {extract} LIMIT {limit})"
        )
        return f_sql, s_sql

    prop = V2_ID[field]
    if field == "text":
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop}' AND pv.value_text LIKE '{TEXT_LIKE}' "
            f"LIMIT {limit})"
        )
        order = "pv.value_text"
    elif field == "number":
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop}' "
            f"AND pv.value_number BETWEEN {NUM_MIN} AND {NUM_MAX} LIMIT {limit})"
        )
        order = "pv.value_number"
    else:
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop}' "
            f"AND pv.value_option_id = '{OPTION_ID}' LIMIT {limit})"
        )
        order = (
            "(SELECT pvo.name FROM property_v2_option pvo "
            "WHERE pvo.id = pv.value_option_id)"
        )
    s_sql = (
        f"SELECT count(*) FROM (SELECT n.id FROM name n "
        f"LEFT JOIN property_v2_value pv ON pv.record_id = n.id "
        f"AND pv.table_name = 'name' AND pv.property_id = '{prop}' "
        f"ORDER BY {order} LIMIT {limit}) t"
    )
    return f_sql, s_sql


def queries_postgres(field: str, method: str, limit: int) -> Tuple[str, str]:
    if method in ("legacy", "legacyJsonb"):
        if method == "legacyJsonb":
            extract = f"(name.properties_jsonb ->> '{LEGACY_KEY[field]}')"
        else:
            extract = f"((name.properties::jsonb) ->> '{LEGACY_KEY[field]}')"
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

    prop = V2_ID[field]
    if field == "text":
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop}' AND pv.value_text ILIKE '{TEXT_LIKE}' "
            f"LIMIT {limit}) t"
        )
        order = "pv.value_text"
    elif field == "number":
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop}' "
            f"AND pv.value_number BETWEEN {NUM_MIN} AND {NUM_MAX} LIMIT {limit}) t"
        )
        order = "pv.value_number"
    else:
        f_sql = (
            f"SELECT count(*) FROM (SELECT n.id FROM name n "
            f"JOIN property_v2_value pv ON pv.record_id = n.id AND pv.table_name = 'name' "
            f"WHERE pv.property_id = '{prop}' "
            f"AND pv.value_option_id = '{OPTION_ID}' LIMIT {limit}) t"
        )
        order = (
            "(SELECT pvo.name FROM property_v2_option pvo "
            "WHERE pvo.id = pv.value_option_id)"
        )
    s_sql = (
        f"SELECT count(*) FROM (SELECT n.id FROM name n "
        f"LEFT JOIN property_v2_value pv ON pv.record_id = n.id "
        f"AND pv.table_name = 'name' AND pv.property_id = '{prop}' "
        f"ORDER BY {order} LIMIT {limit}) t"
    )
    return f_sql, s_sql


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


METHODS = ["legacy", "legacyJsonb", "v2"]
FIELDS = ["text", "number", "option"]
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
        for method in METHODS:
            f_sql, s_sql = gen_queries(field, method, limit)
            for op, sql in (("filter", f_sql), ("sort", s_sql)):
                runner = make_runner(sql)
                try:
                    samples, timed_out = sample_case(
                        runner, iterations, do_warmup, timeout_ms
                    )
                except Exception as e:
                    print(f"  {op:6} {field:6} {method:11} ERROR: {e}")
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
                    f"  {op:6} {field:6} {method:11} "
                    f"cold {cold:7.2f}ms  steady-median {steady:7.2f}ms  "
                    f"min {min(samples) if samples else 0:7.2f}  "
                    f"max {max(samples) if samples else 0:7.2f}{marker}"
                )
    return results


# -------------------------------------------------------------------- plotting


METHOD_COLORS = {
    "legacy": "#bfa15a",       # legacy text JSON
    "legacyJsonb": "#5aa5bf",  # JSONB twin
    "v2": "#7fbf6e",            # V2 relational
}
METHOD_LABEL = {
    "legacy": "legacy (text JSON)",
    "legacyJsonb": "legacy (JSONB)",
    "v2": "V2 relational",
}


def _draw_bars(ax, results: Dict[str, CaseSamples], op: str, cap_ms: float):
    """Grouped bars per field, hue per method. If any bar's median exceeds
    `cap_ms`, the y-axis is capped at `cap_ms`, the overflowing bars are
    striped + annotated with the real value, and a red guide line is drawn.
    If everything fits under the cap the axis autoscales and no guide line
    appears — keeps small-value plots from looking like dust under a ceiling."""
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

    for j, method in enumerate(METHODS):
        meds_lo_hi = cells[j]
        meds = [m for m, _, _, _ in meds_lo_hi]
        clipped_meds = [
            min(m, cap_ms) if any_overflow else m for m in meds
        ]
        offs = -0.4 + bar_w / 2 + j * bar_w
        bars = ax.bar(
            x + offs,
            clipped_meds,
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

    ax.set_xticks(x)
    ax.set_xticklabels(FIELDS)
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
    fig, axes = plt.subplots(
        nrows=2, ncols=n_cols, figsize=(5.5 * n_cols, 7), squeeze=False
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
    fig, axes = plt.subplots(
        nrows=2, ncols=len(backends), figsize=(5.5 * len(backends), 7), squeeze=False
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
            ax.set_xticklabels(FIELDS)
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

    plot_latency(by_backend, cap_ms=args.cap, out_path=args.out)
    warmup_out = args.out.rsplit(".", 1)
    warmup_out = warmup_out[0] + "_warmup." + (warmup_out[1] if len(warmup_out) > 1 else "png")
    plot_warmup(by_backend, out_path=warmup_out)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
