"""
Must install matplotlib to run this script:
    pip3 install matplotlib

Usage:
    python3 plot_sync_buffer.py results.csv
    python3 plot_sync_buffer.py results.csv --output {chart_name}.png
    python3 plot_sync_buffer.py results.csv --operations upsert_1k_new_tx query_filtered
"""

from __future__ import annotations

import argparse
import csv
import sys
from collections import defaultdict

try:
    import matplotlib.pyplot as plt
    import matplotlib.ticker as ticker
except ImportError:
    print("ERROR: matplotlib is required.  Install with:")
    print("  pip install matplotlib")
    sys.exit(1)


STYLE_MAP = {
    "standard":           {"color": "#2196F3", "marker": "o", "linestyle": "-"},
    "standard+partial":   {"color": "#4CAF50", "marker": "s", "linestyle": "--"},
    "partitioned":        {"color": "#FF9800", "marker": "^", "linestyle": "-"},
    "partitioned-naive":  {"color": "#E91E63", "marker": "D", "linestyle": "-."},
}

OPERATION_LABELS = {
    "upsert_1k_new_raw":        "Upsert 1K new (raw)",
    "upsert_1k_existing_raw":   "Upsert 1K existing (raw)",
    "upsert_1k_new_tx":         "Upsert 1K new (tx)",
    "upsert_1k_existing_tx":    "Upsert 1K existing (tx)",
    "upsert_100_integrated_tx": "Upsert 100 integrated (tx)",
    "query_filtered":           "Query unintegrated (filtered)",
    "query_all_unintegrated":   "Query all unintegrated",
    "mark_100_integrated_tx":   "Mark 100 integrated (tx)",
    "resync_100_tx":            "Re-sync 100 (tx)",
}


def readable_size(n: int) -> str:
    if n >= 1_000_000:
        v = n / 1_000_000
        return f"{v:.1f}M" if v != int(v) else f"{int(v)}M"
    if n >= 1_000:
        v = n / 1_000
        return f"{v:.1f}K" if v != int(v) else f"{int(v)}K"
    return str(n)


def load_csv(path: str) -> list[dict]:
    with open(path) as f:
        reader = csv.DictReader(f)
        rows = []
        for row in reader:
            row["total_rows"] = int(row["total_rows"])
            row["pending_rows"] = int(row["pending_rows"])
            row["duration_ms"] = float(row["duration_ms"])
            rows.append(row)
    return rows


def plot(rows: list[dict], operations: list[str] | None, output: str | None,
         log_scale: bool = False):
    # Group: operation -> approach -> [(total_rows, duration_ms)]
    data: dict[str, dict[str, list[tuple[int, float]]]] = defaultdict(lambda: defaultdict(list))
    for r in rows:
        data[r["operation"]][r["approach"]].append((r["total_rows"], r["duration_ms"]))

    ops = operations or list(data.keys())
    ops = [op for op in ops if op in data]

    if not ops:
        print("No matching operations found in CSV.", file=sys.stderr)
        sys.exit(1)

    ncols = min(2, len(ops))
    nrows = (len(ops) + ncols - 1) // ncols
    fig, axes = plt.subplots(nrows, ncols, figsize=(7 * ncols, 5 * nrows),
                             squeeze=False)

    for idx, op in enumerate(ops):
        ax = axes[idx // ncols][idx % ncols]
        for approach, points in sorted(data[op].items()):
            points.sort(key=lambda p: p[0])
            xs = [p[0] for p in points]
            ys = [p[1] for p in points]
            style = STYLE_MAP.get(approach, {"color": "gray", "marker": "x", "linestyle": ":"})
            ax.plot(xs, ys, label=approach, markersize=6, linewidth=1.5, **style)

        ax.set_title(OPERATION_LABELS.get(op, op), fontsize=11, fontweight="bold")
        ax.set_xlabel("Total rows")
        ax.set_ylabel("Duration (ms)")
        ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: readable_size(int(x))))
        if log_scale:
            ax.set_yscale("log")
        ax.legend(fontsize=8)
        ax.grid(True, alpha=0.3)

    # Hide unused subplots
    for idx in range(len(ops), nrows * ncols):
        axes[idx // ncols][idx % ncols].set_visible(False)

    fig.suptitle("Sync Buffer Scaling Benchmark", fontsize=14, fontweight="bold")
    fig.tight_layout(rect=[0, 0, 1, 0.96])

    if output:
        fig.savefig(output, dpi=150, bbox_inches="tight")
        print(f"Saved to {output}", file=sys.stderr)
    else:
        plt.show()


def main():
    parser = argparse.ArgumentParser(description="Plot sync buffer benchmark results")
    parser.add_argument("csv_file", help="CSV file from bench_sync_buffer.py")
    parser.add_argument("--output", "-o", help="Save plot to file (PNG/PDF/SVG)")
    parser.add_argument("--operations", nargs="+",
                        help="Only plot these operations (default: all)")
    parser.add_argument("--log", action="store_true",
                        help="Use log scale for y-axis")
    args = parser.parse_args()

    rows = load_csv(args.csv_file)
    print(f"Loaded {len(rows)} data points from {args.csv_file}", file=sys.stderr)
    plot(rows, args.operations, args.output, log_scale=args.log)


if __name__ == "__main__":
    main()
