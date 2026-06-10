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


# Per-method styling. The two "indexed" methods (`indexed` for JSONB
# functional index, `v2_indexed` for property_v2_value composite index)
# are paired visually with their unindexed twin — same colour + marker,
# but dashed line and hollow marker. Reads as "this is the same path,
# just with the extra index", which is the comparison the indexed pass
# was added to make.
METHOD_PAIR = {
    "indexed":    "legacyJsonb",
    "v2_indexed": "v2",
}
METHOD_COLORS = {
    "legacy":      "#d62728",
    "legacyJsonb": "#ff7f0e",
    "v2":          "#1f77b4",
    "indexed":     "#ff7f0e",  # paired with legacyJsonb
    "v2_indexed":  "#1f77b4",  # paired with v2
}
METHOD_MARKERS = {
    "legacy": "o", "legacyJsonb": "s", "v2": "^",
    "indexed": "s", "v2_indexed": "^",
}
METHOD_ORDER = ["legacy", "legacyJsonb", "indexed", "v2", "v2_indexed"]
# Display labels — what shows in legends / titles. Use the internal keys
# (METHOD_ORDER) everywhere else; only the legend reads from here.
METHOD_LABEL = {
    "legacy":      "Json",
    "legacyJsonb": "Jsonb",
    "v2":          "Relational",
    "indexed":     "Jsonb (idx)",
    "v2_indexed":  "Relational (idx)",
}


def _plot_method_line(ax, xs, ys, method: str) -> None:
    """Plot one method's line on `ax` with the standard style. Indexed
    methods (those in METHOD_PAIR) draw dashed with hollow markers so they
    sit visually paired with their unindexed twin of the same colour."""
    color = METHOD_COLORS[method]
    marker = METHOD_MARKERS[method]
    label = METHOD_LABEL.get(method, method)
    if method in METHOD_PAIR:
        ax.plot(
            xs, ys, label=label,
            color=color, marker=marker, linestyle="--",
            linewidth=1.2, markersize=4,
            markerfacecolor="white", markeredgecolor=color,
        )
    else:
        ax.plot(
            xs, ys, label=label,
            color=color, marker=marker, linestyle="-",
            linewidth=1.2, markersize=4,
        )


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
        nrows, ncols, figsize=(3.2 * ncols, 2.6 * nrows),
        sharex=True, sharey="row",
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
                    _plot_method_line(ax, xs, ys, m)
                ax.set_xscale("log")
                ax.set_yscale(yscale)
                if yscale == "log":
                    # Human-friendly tick labels (10^2 → "100ms", 10^3 → "1s")
                    # instead of matplotlib's default scientific notation.
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
                if row == 0:
                    ax.set_title(field, fontsize=9)
                if ci == 0:
                    ax.set_ylabel(f"{backend}\n{op}\nms", fontsize=8)
                if row == nrows - 1:
                    ax.set_xlabel("N stores", fontsize=8)
                ax.tick_params(labelsize=7)

    # Collect handles/labels across ALL subplots and de-duplicate by label.
    # Methods like `indexed` / `v2_indexed` only have data for the `date`
    # column, so axes[0][0] alone (typically a non-date field) would omit
    # them from the legend.
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
    # Order by METHOD_ORDER (display labels) so the legend reads consistently.
    order = {METHOD_LABEL.get(m, m): i for i, m in enumerate(METHOD_ORDER)}
    pairs = sorted(zip(labels, handles), key=lambda p: order.get(p[0], 999))
    labels = [p[0] for p in pairs]
    handles = [p[1] for p in pairs]
    if handles:
        fig.legend(
            handles, labels, loc="upper right", fontsize=8,
            ncol=len(labels), frameon=False,
        )
    fig.suptitle("Properties storage: latency vs dataset size", fontsize=11)
    fig.tight_layout(rect=(0, 0, 1, 0.96))
    fig.savefig(out_path, dpi=140)
    print(f"wrote plot: {out_path}")


def render_quad(rows: List[Dict], field: str, out_path: str, yscale: str = "log") -> None:
    """2×N grid for a single field: rows = backends, cols = (filter, sort).
    Used to inspect one field across both backends and both ops side by
    side, e.g. `--quad date_sparse`."""
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        print(
            "matplotlib not installed — skipping plot. "
            "pip install --user matplotlib numpy",
            file=sys.stderr,
        )
        return

    field_rows = [r for r in rows if r["field"] == field]
    if not field_rows:
        print(f"no rows for field={field}", file=sys.stderr)
        sys.exit(1)

    backends = sorted({r["backend"] for r in field_rows})
    ops = ["filter", "sort"]
    nrows = len(backends)
    ncols = len(ops)
    fig, axes = plt.subplots(
        nrows, ncols, figsize=(4.2 * ncols, 2.8 * nrows),
        sharex=True, sharey="row",
        squeeze=False,
    )

    for ri, backend in enumerate(backends):
        for ci, op in enumerate(ops):
            ax = axes[ri][ci]
            for m in METHOD_ORDER:
                pts = sorted(
                    (r["size"], r["median_ms"])
                    for r in field_rows
                    if r["backend"] == backend
                    and r["op"] == op
                    and r["method"] == m
                )
                if not pts:
                    continue
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                _plot_method_line(ax, xs, ys, m)
            ax.set_xscale("log")
            ax.set_yscale(yscale)
            if yscale == "log":
                from matplotlib.ticker import FuncFormatter, LogLocator
                def _fmt_ms(y, _pos):
                    if y >= 60000:
                        return f"{y / 60000:g}min"
                    if y >= 1000:
                        return f"{y / 1000:g}s"
                    if y >= 1:
                        return f"{y:g}ms"
                    return f"{y * 1000:g}µs"
                ax.yaxis.set_major_locator(LogLocator(base=10.0))
                ax.yaxis.set_major_formatter(FuncFormatter(_fmt_ms))
            ax.grid(True, which="both", linestyle=":", alpha=0.4)
            ax.set_title(f"{backend} — {op}", fontsize=10)
            if ri == nrows - 1:
                ax.set_xlabel("N stores", fontsize=8)
            ax.tick_params(labelsize=7)

    # Legend de-duped across subplots, ordered by METHOD_ORDER.
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
    order = {METHOD_LABEL.get(m, m): i for i, m in enumerate(METHOD_ORDER)}
    pairs = sorted(zip(labels, handles), key=lambda p: order.get(p[0], 999))
    labels = [p[0] for p in pairs]
    handles = [p[1] for p in pairs]
    if handles:
        fig.legend(
            handles, labels,
            loc="upper center", bbox_to_anchor=(0.5, 0.94),
            fontsize=8, ncol=len(labels), frameon=False,
        )
    fig.suptitle(f"{field} — backend × op", fontsize=11, y=0.985)
    # Reserve top ~8% for title + legend (title at 0.985, legend at 0.94,
    # subplots fill below 0.92). Tighter than the default 4% reserve, but
    # without the gaping void the looser 0.88 left behind.
    fig.tight_layout(rect=(0, 0, 1, 0.92))
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
    ap.add_argument(
        "--quad", default=None,
        help="If set, render a 2×2 single-field quad (backends × filter/sort) "
        "for this field instead of the full grid. Example: --quad date_sparse.",
    )
    args = ap.parse_args()

    rows = load_csv(args.csv)
    if not rows:
        print(f"no rows in {args.csv}", file=sys.stderr)
        sys.exit(1)
    if args.quad:
        render_quad(rows, args.quad, args.out, yscale=args.yscale)
    else:
        render(rows, args.out, yscale=args.yscale)


if __name__ == "__main__":
    main()
