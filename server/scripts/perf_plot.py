#!/usr/bin/env python3
"""Bar-chart per-size view of a `perf_sql_test.py` CSV.

Where `perf_scale_plot.py` plots scaling lines (x = N), this script plots
grouped bars at one chosen size — one bar per method per field, one subplot
per (backend, op). Same input format, different visualization.

Usage:
    python3 server/scripts/perf_plot.py --csv perf_scale.csv \\
        --size 100000 --out /tmp/perf_bars.png

If --size is omitted, the largest size in the CSV is used. If --cap is set,
bars above it are clipped + striped + annotated with their real value so
sub-ms bars stay visible alongside multi-second ones.
"""

import argparse
import csv
import sys
from typing import Dict, List, Optional, Tuple


# Shared with perf_scale_plot.py — keeps method colours AND legend labels
# consistent across the line plot (scaling) and bar plot (per-size).
from perf_scale_plot import (  # noqa: E402
    METHOD_COLORS, METHOD_ORDER, METHOD_LABEL,
)


def load_csv(path: str) -> List[Dict]:
    rows: List[Dict] = []
    with open(path, newline="") as f:
        for raw in csv.DictReader(f):
            rows.append({
                "backend":   raw["backend"],
                "size":      int(raw["size"]),
                "op":        raw["op"],
                "field":     raw["field"],
                "method":    raw["method"],
                "median_ms": float(raw["median_ms"]),
                "p95_ms":    float(raw["p95_ms"]),
            })
    return rows


def field_sort_key(field: str) -> Tuple[int, str]:
    """Dense fields first in natural type order, sparse after, alphabetical."""
    dense_order = {"text": 0, "number": 1, "option": 2, "date": 3,
                   "nested_city": 4}
    if field in dense_order:
        return (0, f"{dense_order[field]:02d}")
    return (1, field)


def draw_bars(ax, by_method: Dict[str, Dict[str, Tuple[float, float]]],
              fields: List[str], cap_ms: Optional[float]) -> None:
    """Grouped bars: x = field, hue = method, y = median (whiskers = p95).
    `by_method[method][field] = (median, p95)`. Bars exceeding `cap_ms` are
    clipped, hatched, and annotated with the real value. Sub-ms bars get
    bumped to a min-visible stub so they don't disappear next to multi-second
    bars."""
    import numpy as np

    methods_present = [m for m in METHOD_ORDER if m in by_method]
    if not methods_present:
        ax.set_title("(no data)")
        return

    n_methods = len(methods_present)
    n_fields = len(fields)
    bar_w = 0.8 / n_methods
    x = np.arange(n_fields)

    # First pass: collect cells and detect overflow vs cap.
    cells: List[List[Tuple[float, float]]] = []  # cells[m][f] = (median, p95)
    any_overflow = False
    for method in methods_present:
        row = []
        for f in fields:
            v = by_method[method].get(f)
            med, p95 = v if v is not None else (0.0, 0.0)
            row.append((med, p95))
            if cap_ms is not None and med > cap_ms:
                any_overflow = True
        cells.append(row)

    y_limit = cap_ms if (cap_ms is not None and any_overflow) else None
    y_top = y_limit if y_limit is not None else max(
        (m for r in cells for m, _ in r if m > 0), default=1.0
    )
    min_visible = y_top * 0.03  # sub-ms bars get a stub the eye can find

    for j, method in enumerate(methods_present):
        meds_p95 = cells[j]
        drawn = [
            min(m, cap_ms) if (cap_ms is not None and any_overflow) else m
            for m, _ in meds_p95
        ]
        drawn = [max(h, min_visible) if h > 0 else 0.0 for h in drawn]
        offs = -0.4 + bar_w / 2 + j * bar_w
        bars = ax.bar(
            x + offs, drawn, bar_w * 0.9,
            color=METHOD_COLORS[method], edgecolor="black", linewidth=0.4,
            label=METHOD_LABEL[method],
        )
        for i, bar in enumerate(bars):
            med, p95 = meds_p95[i]
            if med == 0:
                continue
            cx = bar.get_x() + bar.get_width() / 2
            p95_draw = min(p95, cap_ms) if (cap_ms is not None and any_overflow) else p95
            # Whisker from median up to p95
            if p95 > med:
                ax.plot([cx, cx], [med, p95_draw], color="black", linewidth=0.6)
                ax.plot([cx - bar_w * 0.15, cx + bar_w * 0.15],
                        [p95_draw, p95_draw], color="black", linewidth=0.6)
            if cap_ms is not None and any_overflow and med > cap_ms:
                bar.set_hatch("///")
                ax.annotate(f"{med:.0f}ms",
                            xy=(cx, cap_ms), xytext=(0, 4),
                            textcoords="offset points",
                            ha="center", fontsize=7, color="black")
            elif med < min_visible:
                ax.annotate(
                    f"{med:.2f}ms" if med >= 0.1 else f"{med * 1000:.0f}µs",
                    xy=(cx, min_visible), xytext=(0, 4),
                    textcoords="offset points",
                    ha="left", va="bottom", rotation=45,
                    fontsize=6, color="black")

    ax.set_xticks(x)
    ax.set_xticklabels(fields, rotation=25, ha="right", fontsize=8)
    if y_limit is not None:
        ax.set_ylim(0, y_limit * 1.08)
        ax.axhline(y_limit, color="red", linestyle=":", linewidth=0.8, alpha=0.5)
    else:
        ax.set_ylim(bottom=0)
    ax.set_ylabel("median latency (ms)", fontsize=8)
    ax.grid(axis="y", linestyle=":", alpha=0.35)


def render(rows: List[Dict], size: int, out_path: str,
           cap_ms: Optional[float] = None) -> None:
    """Render one figure: rows = backends, cols = (filter, sort).
    Filtered to the chosen `size`."""
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib not installed — pip install --user matplotlib numpy",
              file=sys.stderr)
        return

    rows = [r for r in rows if r["size"] == size]
    if not rows:
        print(f"no rows at size={size}", file=sys.stderr)
        sys.exit(1)

    backends = sorted({r["backend"] for r in rows})
    fields = sorted({r["field"] for r in rows}, key=field_sort_key)
    ops = ["filter", "sort"]

    fig, axes = plt.subplots(
        len(backends), len(ops),
        figsize=(0.8 * len(fields) + 4, 3.0 * len(backends)),
        squeeze=False,
    )

    for bi, backend in enumerate(backends):
        for oi, op in enumerate(ops):
            ax = axes[bi][oi]
            # by_method[method][field] = (median, p95)
            by_method: Dict[str, Dict[str, Tuple[float, float]]] = {}
            for r in rows:
                if r["backend"] != backend or r["op"] != op:
                    continue
                by_method.setdefault(r["method"], {})[r["field"]] = (
                    r["median_ms"], r["p95_ms"],
                )
            draw_bars(ax, by_method, fields, cap_ms)
            ax.set_title(f"{backend} — {op}", fontsize=10)

    # Single shared legend
    handles, labels = axes[0][0].get_legend_handles_labels()
    if handles:
        fig.legend(handles, labels, loc="upper right",
                   fontsize=8, frameon=False)
    fig.suptitle(f"Properties storage perf @ N={size:,}", fontsize=11)
    fig.tight_layout(rect=(0, 0, 1, 0.95))
    fig.savefig(out_path, dpi=140)
    print(f"wrote plot: {out_path}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--csv", required=True, help="Input CSV (perf_sql_test format)")
    ap.add_argument("--size", type=int, default=None,
                    help="Dataset size to plot (default: largest in CSV)")
    ap.add_argument("--out", default="/tmp/perf_bars.png", help="Output PNG path")
    ap.add_argument(
        "--cap", type=float, default=None,
        help="Cap the y-axis at this many ms. Bars above are striped + "
        "annotated with their real value. Useful when a few legacy/sort "
        "cases run 10–30s and squash everything else.",
    )
    args = ap.parse_args()

    rows = load_csv(args.csv)
    if not rows:
        print(f"no rows in {args.csv}", file=sys.stderr)
        sys.exit(1)

    size = args.size
    if size is None:
        size = max(r["size"] for r in rows)
        print(f"--size not given, using largest in CSV: {size}", file=sys.stderr)

    render(rows, size, args.out, cap_ms=args.cap)


if __name__ == "__main__":
    main()
