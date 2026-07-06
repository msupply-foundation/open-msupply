# Sync V7 investigation

Design investigation, benchmark scripts and their results that backed the **Sync V7** work.
This is reference material — discussions, trade-offs, prototypes and performance numbers — not
part of the server build (the crates here are excluded from the Cargo workspace).

The "how it works now" specification lives in the rendered developer docs:

- **Sync V7 spec** — `docs/content/docs/sync/v7/` (published at the dev docs site under Sync → Sync V7)
- **Living with V5, V6 and V7** — `docs/content/docs/sync/transition/`
- **Sync styles** — `docs/content/docs/sync/sync_styles/`

## Contents

- [`batch-upsert/`](batch-upsert/) — prototype/benchmark for batched upserts.
- [`changelog/`](changelog/) — changelog insert-performance investigation:
  - [`bench/`](changelog/bench/) — Postgres insert benchmark tool (config-driven scenarios; Docker + `plotters`).
  - [`locking/`](changelog/locking/) — changelog write-lock / cursor-contention analysis, with prototype diffs.
  - [`query-speed/`](changelog/query-speed/) — outgoing-query speed notes.
  - [`results/`](changelog/results/) — captured benchmark results and summary.
- [`sync_buffer/`](sync_buffer/) — sync_buffer shape, partitioning and append-only design:
  - [`bench/`](sync_buffer/bench/) — sync_buffer insert/query benchmark scripts.
  - [`results/`](sync_buffer/results/) — captured results.
- [`work_plan.drawio.svg`](work_plan.drawio.svg) — the original V7 work plan diagram.
