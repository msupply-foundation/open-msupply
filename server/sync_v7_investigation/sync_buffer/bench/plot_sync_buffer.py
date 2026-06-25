"""
Plot sync buffer benchmark CSV files.

Supports multiple CSV files and generates:
1) Individual scenario charts.
2) Combined charts across scenarios.

Each chart is split into insert/query/update speed panels.

Usage:
    python3 plot_sync_buffer.py results_a.csv results_b.csv --output-dir charts
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import statistics
import sys
from collections import defaultdict

try:
    import matplotlib.pyplot as plt
    import matplotlib.ticker as ticker
except ImportError:
    print("ERROR: matplotlib is required. Install with: pip install matplotlib")
    sys.exit(1)


METRIC_GROUPS = ["insert", "query", "update"]
GROUP_TITLES = {
    "insert": "Insert Throughput",
    "query": "Query Speed",
    "update": "Update Speed",
}
GROUP_Y_LABELS = {
    "insert": "Rows / second",
    "query": "Duration (ms)",
    "update": "Duration (ms)",
}


def readable_size(n: int) -> str:
    if n >= 1_000_000:
        v = n / 1_000_000
        return f"{v:.1f}M" if v != int(v) else f"{int(v)}M"
    if n >= 1_000:
        v = n / 1_000
        return f"{v:.1f}K" if v != int(v) else f"{int(v)}K"
    return str(n)


def sanitize_name(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "_", name.strip())
    return cleaned or "scenario"


def load_rows(csv_paths: list[str]) -> list[dict]:
    all_rows: list[dict] = []
    for path in csv_paths:
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                row["source_file"] = path
                row["bench_round"] = int(row.get("bench_round") or 0)
                row["iteration"] = int(row.get("iteration") or 0)
                row["duration_ms"] = float(row.get("duration_ms") or 0.0)
                row["rows_at_bench_start"] = int(row.get("rows_at_bench_start") or 0)
                row["total_rows_current"] = int(row.get("total_rows_current") or 0)
                try:
                    row["rows_affected"] = int(row.get("rows_affected") or 0)
                except ValueError:
                    row["rows_affected"] = 0
                all_rows.append(row)
    return all_rows


def aggregate_for_plot(
    rows: list[dict], top_pct: int = 50
) -> dict[str, dict[str, list[tuple[int, float, float]]]]:
    # scenario -> metric_group -> [(rows_at_bench_start, fastest, avg_top_pct)]
    grouped_values: dict[str, dict[str, dict[tuple[int, int], list[float]]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(list))
    )

    for row in rows:
        metric = row.get("metric_group", "")
        if metric not in METRIC_GROUPS:
            continue
        scenario = row.get("scenario_name", "unknown")
        key = (row["bench_round"], row["rows_at_bench_start"])
        if metric == "insert":
            # Convert duration_ms + rows_affected into rows/second
            duration_ms = row["duration_ms"]
            rows_affected = row["rows_affected"]
            if duration_ms <= 0 or rows_affected <= 0:
                continue
            value = rows_affected * 1000.0 / duration_ms
        else:
            value = row["duration_ms"]
        grouped_values[scenario][metric][key].append(value)

    aggregated: dict[str, dict[str, list[tuple[int, float, float]]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for scenario, metric_map in grouped_values.items():
        for metric, by_round in metric_map.items():
            # For insert (rows/sec), "faster" = higher value.
            # For query/update (ms), "faster" = lower value.
            higher_is_better = metric == "insert"
            points: list[tuple[int, float, float]] = []
            for (_round, rows_start), values in by_round.items():
                sorted_vals = sorted(values, reverse=higher_is_better)
                best = sorted_vals[0]
                n_top = max(1, len(sorted_vals) * top_pct // 100)
                avg_top = statistics.mean(sorted_vals[:n_top])
                points.append((rows_start, best, avg_top))
            points.sort(key=lambda p: p[0])
            aggregated[scenario][metric] = points
    return aggregated


def plot_scenario_panels(
    scenario: str,
    data: dict[str, list[tuple[int, float, float]]],
    out_path: str,
    log_scale: bool,
    top_pct: int,
):
    fig, axes = plt.subplots(1, 3, figsize=(36, 5), squeeze=False)
    for idx, metric in enumerate(METRIC_GROUPS):
        ax = axes[0][idx]
        points = data.get(metric, [])
        if points:
            xs = [p[0] for p in points]
            ys_fastest = [p[1] for p in points]
            ys_avg_top = [p[2] for p in points]
            ax.plot(xs, ys_fastest, linewidth=0.8, color="#1f77b4", label="Fastest")
            ax.plot(xs, ys_avg_top, linewidth=1.8, color="#1f77b4", label=f"Avg top {top_pct}%")
        ax.set_title(GROUP_TITLES[metric], fontsize=11, fontweight="bold")
        ax.set_xlabel("Rows at Bench Start")
        ax.set_ylabel(GROUP_Y_LABELS[metric])
        ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: readable_size(int(x))))
        if metric == "insert":
            ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda y, _: readable_size(int(y))))
        if log_scale:
            ax.set_yscale("log")
        ax.grid(True, alpha=0.3)
        if points:
            ax.legend(fontsize=8)

    fig.suptitle(f"Scenario: {scenario}", fontsize=14, fontweight="bold")
    fig.tight_layout(rect=[0, 0, 1, 0.95])
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)


def plot_combined_panels(
    aggregated: dict[str, dict[str, list[tuple[int, float, float]]]],
    out_path: str,
    log_scale: bool,
    top_pct: int,
):
    fig, axes = plt.subplots(1, 3, figsize=(36, 5), squeeze=False)
    colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2"]

    for idx, metric in enumerate(METRIC_GROUPS):
        ax = axes[0][idx]
        color_i = 0
        for scenario in sorted(aggregated.keys()):
            points = aggregated[scenario].get(metric, [])
            if not points:
                continue
            xs = [p[0] for p in points]
            ys_fastest = [p[1] for p in points]
            ys_avg_top = [p[2] for p in points]
            c = colors[color_i % len(colors)]
            ax.plot(xs, ys_fastest, linewidth=0.8, color=c, label=f"{scenario} fastest")
            ax.plot(
                xs, ys_avg_top, linewidth=1.8, color=c,
                label=f"{scenario} avg top {top_pct}%",
            )
            color_i += 1

        ax.set_title(GROUP_TITLES[metric], fontsize=11, fontweight="bold")
        ax.set_xlabel("Rows at Bench Start")
        ax.set_ylabel(GROUP_Y_LABELS[metric])
        ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: readable_size(int(x))))
        if metric == "insert":
            ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda y, _: readable_size(int(y))))
        if log_scale:
            ax.set_yscale("log")
        ax.grid(True, alpha=0.3)
        ax.legend(fontsize=8)

    fig.suptitle("Sync Buffer Benchmark: Combined Scenarios", fontsize=14, fontweight="bold")
    fig.tight_layout(rect=[0, 0, 1, 0.95])
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Plot sync buffer benchmark CSV outputs")
    p.add_argument("csv_files", nargs="+", help="One or more CSV files from bench_sync_buffer.py")
    p.add_argument("--output-dir", "-o", default="plots", help="Directory for generated charts")
    p.add_argument("--log", action="store_true", help="Use log scale for y-axis")
    p.add_argument(
        "--top-pct", type=int, default=50,
        help="Average the fastest X%% of values per point (default: 50)",
    )
    return p


def main():
    args = build_parser().parse_args()
    os.makedirs(args.output_dir, exist_ok=True)

    rows = load_rows(args.csv_files)
    if not rows:
        print("No rows found in CSV inputs.", file=sys.stderr)
        sys.exit(1)

    aggregated = aggregate_for_plot(rows, args.top_pct)
    if not aggregated:
        print("No plottable benchmark rows found.", file=sys.stderr)
        sys.exit(1)

    for scenario, metric_data in sorted(aggregated.items()):
        scenario_file = os.path.join(args.output_dir, f"scenario_{sanitize_name(scenario)}.png")
        plot_scenario_panels(scenario, metric_data, scenario_file, args.log, args.top_pct)
        print(f"Saved {scenario_file}", file=sys.stderr)

    combined_file = os.path.join(args.output_dir, "combined_scenarios.png")
    plot_combined_panels(aggregated, combined_file, args.log, args.top_pct)
    print(f"Saved {combined_file}", file=sys.stderr)


if __name__ == "__main__":
    main()