#!/usr/bin/env python3
"""Generate the charts for count-performance-report.html and inline them as base64 PNGs.

All numbers are from the WS6 follow-up benchmarks on demoivory_lt (1,004,135-invoice store,
k6 50 VUs / 20s, Rust release server, local Postgres 16) — see server-go/docs/DECISION.md.

Usage:
    python3 count_report_charts.py            # reads count-performance-report.src.html,
                                              # writes count-performance-report.html
Charts are also written as standalone PNGs next to this script for reuse.
"""

import base64
import io
import pathlib

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

HERE = pathlib.Path(__file__).parent
SRC = HERE / "count-performance-report.src.html"
OUT = HERE / "count-performance-report.html"

# Palette matched to the report CSS.
INK = "#1b2733"
MUTED = "#5b6b7b"
LINE = "#e3e8ee"
INDIGO = "#4f46e5"
GREEN = "#16a34a"
AMBER = "#c2790b"
RED = "#b91c1c"
SLATE = "#94a3b8"

plt.rcParams.update(
    {
        "font.family": "Helvetica",
        "text.color": INK,
        "axes.edgecolor": LINE,
        "axes.labelcolor": MUTED,
        "xtick.color": MUTED,
        "ytick.color": INK,
        "figure.facecolor": "white",
        "axes.facecolor": "white",
        "svg.fonttype": "none",
    }
)


def hbar(ax, labels, values, colors, unit, annotate=None, log=False):
    y = range(len(labels))[::-1]
    bars = ax.barh(list(y), values, color=colors, height=0.62, zorder=3)
    ax.set_yticks(list(y))
    ax.set_yticklabels(labels, fontsize=11)
    if log:
        ax.set_xscale("log")
    ax.grid(axis="x", color=LINE, zorder=0)
    ax.spines[["top", "right", "left"]].set_visible(False)
    annotate = annotate or [f"{v:,g} {unit}" for v in values]
    for bar, text in zip(bars, annotate):
        ax.text(
            bar.get_width() * (1.06 if log else 1.0) + (0 if log else max(values) * 0.012),
            bar.get_y() + bar.get_height() / 2,
            text,
            va="center",
            fontsize=10.5,
            fontweight="bold",
            color=INK,
        )


def fig_to_b64(fig, name):
    fig.savefig(HERE / name, dpi=160, bbox_inches="tight")
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=160, bbox_inches="tight")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode()


charts = {}

# ── 1. Throughput by strategy (the headline) ────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(8.6, 3.6))
labels = [
    "Today: exact COUNT every request",
    "B — client caches count (1-in-25 exact)",
    "A — planner estimate",
    "C — backend count cache",
    "A + B combined",
    "Ceiling: count never requested",
]
values = [21, 300, 1467, 1664, 1790, 1884]
colors = [RED, AMBER, INDIGO, INDIGO, GREEN, SLATE]
hbar(
    ax,
    labels,
    values,
    colors,
    "req/s",
    annotate=["21 req/s", "300 req/s", "1,467 req/s", "1,664 req/s", "1,790 req/s", "1,884 req/s"],
)
ax.set_xlabel("requests / second (1M-invoice store, 50 concurrent users)", fontsize=10.5)
ax.set_xlim(0, 2150)
charts["THROUGHPUT"] = fig_to_b64(fig, "chart-throughput.png")

# ── 2. p95 latency by strategy ──────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(8.6, 3.6))
values = [3700, 634, 51, 47, 44, 40]
hbar(
    ax,
    labels,
    values,
    colors,
    "ms",
    annotate=["3.7 s", "634 ms", "51 ms", "47 ms", "44 ms", "40 ms"],
)
ax.set_xlabel("p95 response time (ms) — lower is better", fontsize=10.5)
ax.set_xlim(0, 4300)
charts["LATENCY"] = fig_to_b64(fig, "chart-latency.png")

# ── 3. Anatomy of one request today: the count IS the request ───────────────────────────
fig, ax = plt.subplots(figsize=(8.6, 2.1))
ax.barh([0], [17], color=GREEN, height=0.5, zorder=3, label="50-row page + names (17 ms)")
ax.barh([0], [263], left=[17], color=RED, height=0.5, zorder=3, label="exact COUNT for totalCount (263 ms)")
ax.text(8.5, 0, "", va="center")
ax.text(17 / 2, 0, "page\n17 ms", ha="center", va="center", fontsize=9.5, color="white", fontweight="bold")
ax.text(17 + 263 / 2, 0, "exact COUNT for totalCount — 263 ms (94% of the request)", ha="center",
        va="center", fontsize=10.5, color="white", fontweight="bold")
ax.set_yticks([])
ax.set_xlim(0, 280)
ax.set_xlabel("one invoice-list request on the 1M store, measured at the API (ms)", fontsize=10.5)
ax.grid(axis="x", color=LINE, zorder=0)
ax.spines[["top", "right", "left"]].set_visible(False)
charts["ANATOMY"] = fig_to_b64(fig, "chart-anatomy.png")

# ── 4. Cost of one count, by method (single query, warm cache, psql) ────────────────────
fig, ax = plt.subplots(figsize=(8.6, 3.0))
labels4 = [
    "Exact COUNT (view + name join) — today",
    "Exact COUNT, join skipped",
    "Capped count (exact up to 1,000)",
    "Planner estimate (EXPLAIN)",
]
values4 = [108, 42, 11, 8]
colors4 = [RED, AMBER, INDIGO, GREEN]
hbar(ax, labels4, values4, colors4, "ms",
     annotate=["108 ms", "35–48 ms", "11 ms", "8 ms"])
ax.set_xlabel("one count of 1,004,135 rows, warm cache (ms)", fontsize=10.5)
charts["COUNTMETHODS"] = fig_to_b64(fig, "chart-count-methods.png")

# ── 5. Index effect on the 50-row page query (EXPLAIN ANALYZE execution time) ───────────
fig, ax = plt.subplots(figsize=(8.6, 2.4))
labels5 = [
    "Before: single-column invoice_number index\n(planner walks it, discards 707 rows/page)",
    "After: composite (store_id, invoice_number)\n(reads exactly the 50 rows)",
]
values5 = [2.1, 0.9]
hbar(ax, labels5, values5, [AMBER, GREEN], "ms", annotate=["2.1 ms", "0.9 ms"])
ax.set_xlabel("50-row sorted page query, EXPLAIN ANALYZE execution time (ms)", fontsize=10.5)
charts["INDEX"] = fig_to_b64(fig, "chart-index.png")

# ── Inline into the HTML template ───────────────────────────────────────────────────────
html = SRC.read_text()
for key, b64 in charts.items():
    html = html.replace("{{CHART:%s}}" % key, "data:image/png;base64," + b64)
OUT.write_text(html)
print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB) and {len(charts)} standalone PNGs")
