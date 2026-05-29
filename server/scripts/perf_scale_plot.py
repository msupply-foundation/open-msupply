#!/usr/bin/env python3
"""Render the scaling plot from a `perf_scale.py` CSV.

Pulled out of `perf_scale.py` so the (slow) sweep can be run once and the
plot can be iterated on freely — change colours, log/linear axes, subplot
layout, etc. without re-running hours of measurements.

Usage:
    python3 server/scripts/perf_scale_plot.py \\
        --csv /tmp/perf_scale.csv \\
        --out /tmp/perf_scale.png

CSV columns expected (written by `perf_scale.py`):
    backend, size, op, field, method, median_ms, p95_ms,
    cleanup_ms, seed_ms_dense, seed_ms_sparse
"""

import argparse
import csv
import sys
from typing import Dict, List, Tuple


def load_csv(path: str) -> List[Dict]:
    """Read a perf_scale CSV; coerce numeric columns to floats / ints."""
    rows: List[Dict] = []
    with open(path, newline="") as f:
        for raw in csv.DictReader(f):
            rows.append({
                "backend": raw["backend"],
                "size": int(raw["size"]),
                "op": raw["op"],
                "field": raw["field"],
                "method": raw["method"],
                "median_ms": float(raw["median_ms"]),
                "p95_ms": float(raw["p95_ms"]),
            })
    return rows


def field_sort_key(field: str) -> Tuple[int, str]:
    """Dense fields first in the natural type order, then sparse alphabetically."""
    dense_order = {"text": 0, "number": 1, "option": 2, "date": 3}
    if field in dense_order:
        return (0, f"{dense_order[field]:02d}")
    return (1, field)


# Stable per-method styling — keeps the colour for `v2` (the new path) the
# same across iterations so eyes can re-orient quickly between renders.
METHOD_COLORS = {
    "legacy":      "#d62728",
    "legacyJsonb": "#ff7f0e",
    "v2":          "#1f77b4",
    "indexed":     "#2ca02c",
}
METHOD_MARKERS = {
    "legacy": "o", "legacyJsonb": "s", "v2": "^", "indexed": "x",
}
METHOD_ORDER = ["legacy", "legacyJsonb", "v2", "indexed"]


def render(rows: List[Dict], out_path: str, yscale: str = "log") -> None:
    """Grid of subplots: rows = (backend, op), cols = field. Each subplot
    shows median latency vs N, one line per method.

    `yscale` is passed to `ax.set_yscale` — "log" (default) or "linear".
    Linear is easier to read absolute differences off; log is essential for
    spanning ms-to-multi-second ranges in one frame.
    """
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
    ops = ["filter", "sort"]
    fields = sorted({r["field"] for r in rows}, key=field_sort_key)

    nrows = len(backends) * len(ops)
    ncols = len(fields)
    fig, axes = plt.subplots(
        nrows, ncols, figsize=(3.2 * ncols, 2.6 * nrows), sharex=True,
        squeeze=False,
    )

    for bi, backend in enumerate(backends):
        for oi, op in enumerate(ops):
            row = bi * len(ops) + oi
            for ci, field in enumerate(fields):
                ax = axes[row][ci]
                for m in METHOD_ORDER:
                    pts = sorted(
                        (r["size"], r["median_ms"])
                        for r in rows
                        if r["backend"] == backend
                        and r["op"] == op
                        and r["field"] == field
                        and r["method"] == m
                    )
                    if not pts:
                        continue
                    xs = [p[0] for p in pts]
                    ys = [p[1] for p in pts]
                    ax.plot(
                        xs, ys,
                        label=m, color=METHOD_COLORS[m],
                        marker=METHOD_MARKERS[m],
                        linewidth=1.2, markersize=4,
                    )
                ax.set_xscale("log")
                ax.set_yscale(yscale)
                ax.grid(True, which="both", linestyle=":", alpha=0.4)
                if row == 0:
                    ax.set_title(field, fontsize=9)
                if ci == 0:
                    ax.set_ylabel(f"{backend}\n{op}\nms", fontsize=8)
                if row == nrows - 1:
                    ax.set_xlabel("N stores", fontsize=8)
                ax.tick_params(labelsize=7)

    handles, labels = axes[0][0].get_legend_handles_labels()
    if handles:
        fig.legend(
            handles, labels, loc="upper right", fontsize=8,
            ncol=len(labels), frameon=False,
        )
    fig.suptitle("Properties storage: latency vs dataset size", fontsize=11)
    fig.tight_layout(rect=(0, 0, 1, 0.96))
    fig.savefig(out_path, dpi=140)
    print(f"wrote plot: {out_path}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--csv", required=True, help="Input CSV from perf_scale.py")
    ap.add_argument("--out", default="/tmp/perf_scale.png", help="Output PNG path")
    ap.add_argument(
        "--yscale", choices=["log", "linear"], default="log",
        help="Y-axis scale (default log; use 'linear' to read absolute "
        "differences off the chart).",
    )
    args = ap.parse_args()

    rows = load_csv(args.csv)
    if not rows:
        print(f"no rows in {args.csv}", file=sys.stderr)
        sys.exit(1)
    render(rows, args.out, yscale=args.yscale)


if __name__ == "__main__":
    main()
