#!/usr/bin/env python3
"""Render scaling plots from a `perf_insert_test.py` CSV.

Sibling of `perf_scale_plot.py` for the insert/delete/index-build CSV
(different shape: `op` is one of the 6 lifecycle steps; there's no
`field`, just one row per `(backend, size, method, op)`).

Usage:
    python3 server/scripts/perf_insert_plot.py \\
        --csv /tmp/perf_insert_test.csv \\
        --out /tmp/perf_insert.png

CSV columns expected (written by `perf_insert_test.py`):
    backend, size, method, op, elapsed_ms
"""

import argparse
import csv
import sys
from typing import Dict, List


# Plot layout: one row per logical chart. INSERT and DELETE overlay the
# unindexed + indexed states on a single subplot (same colour/marker per
# method, dashed line + hollow marker for the indexed variant) so the
# index-maintenance delta reads as a direct visual gap. CREATE/DROP INDEX
# are single-state ops and render with 3 solid lines.
CHART_ROWS = [
    {"title": "INSERT",       "unindexed": "insert_cold",      "indexed": "insert_indexed"},
    {"title": "DELETE",       "unindexed": "delete_unindexed", "indexed": "delete_indexed"},
    {"title": "CREATE INDEX", "unindexed": "create_index_cold", "indexed": None},
    {"title": "DROP INDEX",   "unindexed": "drop_index",        "indexed": None},
]

# Ops referenced anywhere (used for "is this op present in the CSV" checks
# and by the bars chart).
OP_ORDER = [
    "insert_cold",
    "insert_indexed",
    "create_index_cold",
    "delete_unindexed",
    "delete_indexed",
    "drop_index",
]


# Reuse the read-perf script's method colours so the three methods read
# the same across both plots. `indexed`/`v2_indexed` don't apply here.
METHOD_COLORS = {
    "legacy":      "#d62728",
    "legacyJsonb": "#ff7f0e",
    "v2":          "#1f77b4",
}
METHOD_MARKERS = {"legacy": "o", "legacyJsonb": "s", "v2": "^"}
METHOD_ORDER   = ["legacy", "legacyJsonb", "v2"]
METHOD_LABEL = {
    "legacy":      "Json",
    "legacyJsonb": "Jsonb",
    "v2":          "Relational",
}


def load_csv(path: str) -> List[Dict]:
    rows: List[Dict] = []
    with open(path, newline="") as f:
        for raw in csv.DictReader(f):
            rows.append({
                "backend":    raw["backend"],
                "size":       int(raw["size"]),
                "method":     raw["method"],
                "op":         raw["op"],
                "elapsed_ms": float(raw["elapsed_ms"]),
            })
    return rows


def _plot_method_line(
    ax, rows: List[Dict], backend: str, op: str, method: str,
    indexed: bool,
) -> None:
    """Plot one method's line on `ax`. Same colour+marker per method;
    indexed variant draws dashed with a hollow marker so it sits visually
    underneath the solid unindexed line of the same colour."""
    pts = sorted(
        (r["size"], r["elapsed_ms"])
        for r in rows
        if r["backend"] == backend
        and r["op"] == op
        and r["method"] == method
    )
    if not pts:
        return
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    color = METHOD_COLORS[method]
    base_label = METHOD_LABEL.get(method, method)
    if indexed:
        ax.plot(
            xs, ys,
            label=f"{base_label} (idx)",
            color=color, marker=METHOD_MARKERS[method],
            linestyle="--", linewidth=1.2, markersize=4,
            markerfacecolor="white", markeredgecolor=color,
        )
    else:
        ax.plot(
            xs, ys,
            label=base_label,
            color=color, marker=METHOD_MARKERS[method],
            linestyle="-", linewidth=1.2, markersize=4,
        )


def render(rows: List[Dict], out_path: str, yscale: str = "log") -> None:
    """Grid: rows = logical chart (INSERT / DELETE / CREATE INDEX / DROP
    INDEX); cols = backends. INSERT and DELETE overlay unindexed + indexed
    lines for each method so the per-row index-maintenance cost shows up
    as the gap between solid (unindexed) and dashed (indexed) line of the
    same colour."""
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        print(
            "matplotlib not installed — skipping plot. "
            "pip install --user matplotlib numpy",
            file=sys.stderr,
        )
        return

    backends = sorted({r["backend"] for r in rows})
    # Skip chart rows whose underlying op(s) aren't in the CSV at all.
    chart_rows = [
        c for c in CHART_ROWS
        if any(r["op"] == c["unindexed"] for r in rows)
    ]

    # Layout: rows = backends, cols = chart (INSERT / DELETE / CREATE /
    # DROP INDEX). Landscape, matching perf_scale_log's shape — backends
    # as row labels on the left, chart titles across the top, log-log
    # subplots in the grid.
    nrows = len(backends)
    ncols = len(chart_rows)
    fig, axes = plt.subplots(
        nrows, ncols, figsize=(3.2 * ncols, 2.6 * nrows),
        sharex=True, sharey="row",
        squeeze=False,
    )

    for ri, backend in enumerate(backends):
        for ci, chart in enumerate(chart_rows):
            ax = axes[ri][ci]
            for m in METHOD_ORDER:
                _plot_method_line(
                    ax, rows, backend, chart["unindexed"], m, indexed=False,
                )
                if chart["indexed"] is not None:
                    _plot_method_line(
                        ax, rows, backend, chart["indexed"], m, indexed=True,
                    )
            ax.set_xscale("log")
            ax.set_yscale(yscale)
            if yscale == "log":
                from matplotlib.ticker import FuncFormatter, LogLocator
                def _fmt_ms(y, _pos):
                    if y >= 1000:
                        return f"{y / 1000:g}s"
                    if y >= 1:
                        return f"{y:g}ms"
                    return f"{y * 1000:g}µs"
                ax.yaxis.set_major_locator(LogLocator(base=10.0))
                ax.yaxis.set_major_formatter(FuncFormatter(_fmt_ms))
            ax.grid(True, which="both", linestyle=":", alpha=0.4)
            if ri == 0:
                ax.set_title(chart["title"], fontsize=10)
            if ci == 0:
                ax.set_ylabel(backend, fontsize=9)
            if ri == nrows - 1:
                ax.set_xlabel("N records", fontsize=8)
            ax.tick_params(labelsize=7)

    # Legend de-duped across subplots; order = (method, unindexed-first).
    seen = set()
    handles: list = []
    labels: list = []
    for row_axes in axes:
        for ax in row_axes:
            for h, l in zip(*ax.get_legend_handles_labels()):
                if l in seen:
                    continue
                seen.add(l)
                handles.append(h)
                labels.append(l)
    # Each method contributes up to 2 labels: "Json" and "Json (idx)".
    # Order: method primary, indexed secondary (unindexed first).
    def _label_sort_key(label: str):
        base = label.replace(" (idx)", "")
        method = next(
            (m for m in METHOD_ORDER if METHOD_LABEL.get(m, m) == base),
            None,
        )
        primary = METHOD_ORDER.index(method) if method in METHOD_ORDER else 999
        secondary = 1 if "(idx)" in label else 0
        return (primary, secondary)
    pairs = sorted(zip(labels, handles), key=lambda p: _label_sort_key(p[0]))
    labels = [p[0] for p in pairs]
    handles = [p[1] for p in pairs]
    if handles:
        fig.legend(
            handles, labels,
            loc="upper center", bbox_to_anchor=(0.5, 0.94),
            fontsize=8, ncol=len(labels), frameon=False,
        )
    fig.suptitle(
        "Properties storage: insert/delete/index-build vs N",
        fontsize=11, y=0.985,
    )
    fig.tight_layout(rect=(0, 0, 1, 0.92))
    fig.savefig(out_path, dpi=140)
    print(f"wrote plot: {out_path}")


def render_bars(rows: List[Dict], out_path: str, size: int) -> None:
    """One-size bar chart: x = op, grouped bars per method. Easier to read
    absolute differences at a single N than the scaling lines."""
    try:
        import matplotlib.pyplot as plt
        import numpy as np
    except ImportError:
        print(
            "matplotlib/numpy not installed — skipping bars plot.",
            file=sys.stderr,
        )
        return

    backends = sorted({r["backend"] for r in rows})
    ops_present = [o for o in OP_ORDER if any(r["op"] == o and r["size"] == size for r in rows)]
    if not ops_present:
        print(f"no rows at size={size}", file=sys.stderr)
        return

    fig, axes = plt.subplots(
        1, len(backends), figsize=(5 * len(backends), 4),
        sharey=True, squeeze=False,
    )
    axes = axes[0]
    bar_w = 0.25
    xs = np.arange(len(ops_present))

    for ci, backend in enumerate(backends):
        ax = axes[ci]
        for mi, m in enumerate(METHOD_ORDER):
            ys = []
            for op in ops_present:
                vals = [
                    r["elapsed_ms"]
                    for r in rows
                    if r["backend"] == backend and r["size"] == size
                    and r["method"] == m and r["op"] == op
                ]
                ys.append(vals[0] if vals else 0.0)
            ax.bar(
                xs + (mi - 1) * bar_w, ys, width=bar_w,
                label=METHOD_LABEL.get(m, m), color=METHOD_COLORS[m],
            )
        ax.set_xticks(xs)
        ax.set_xticklabels(ops_present, rotation=30, ha="right", fontsize=8)
        ax.set_title(f"{backend} (N={size:,})", fontsize=10)
        ax.grid(True, axis="y", linestyle=":", alpha=0.4)
        if ci == 0:
            ax.set_ylabel("elapsed (ms)")
        ax.tick_params(labelsize=8)
    axes[-1].legend(fontsize=8, frameon=False)
    fig.suptitle("Properties storage: insert lifecycle at one size", fontsize=11)
    fig.tight_layout(rect=(0, 0, 1, 0.96))
    fig.savefig(out_path, dpi=140)
    print(f"wrote plot: {out_path}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--csv", required=True, help="Input CSV from perf_insert_test.py")
    ap.add_argument(
        "--out", default="/tmp/perf_insert.png",
        help="Output PNG path (scaling lines).",
    )
    ap.add_argument(
        "--yscale", choices=["log", "linear"], default="log",
        help="Y-axis scale for the scaling lines (default log).",
    )
    ap.add_argument(
        "--bars-size", type=int, default=None,
        help="If set, also render a grouped-bar chart at this single N "
             "to ' --bars-out' (default '/tmp/perf_insert_bars.png').",
    )
    ap.add_argument(
        "--bars-out", default="/tmp/perf_insert_bars.png",
        help="Output PNG path for the --bars-size chart.",
    )
    args = ap.parse_args()

    rows = load_csv(args.csv)
    if not rows:
        print(f"no rows in {args.csv}", file=sys.stderr)
        sys.exit(1)

    render(rows, args.out, yscale=args.yscale)

    if args.bars_size is not None:
        render_bars(rows, args.bars_out, size=args.bars_size)


if __name__ == "__main__":
    main()
