# Changelog query speed

## TL;DR

`ChangelogRepository::query` couldn't use the cursor index because joined-column predicates in the filter forced Postgres to materialise-then-sort. Cost scaled with `|changelog|` (~710 ms at 2.4M rows) regardless of LIMIT.

Fix: the application loops sub-queries with a bounded cursor range (`cursor > from AND cursor <= from + 100k`), accumulating up to `limit` rows, until `max_cursor`. Each sub-query now uses `changelog_pkey` as an index condition, dropping typical per-call latency to ~120 ms and making cost independent of table size.

## Test setup

- Local Postgres snapshot of a real site, `changelog` cursor range `1` → `2,402,056`.
- Query: `ChangelogFilter::all_data_for_site(300, false, None)` — the dynamic-query-filter OR tree across the five sync styles (`Central`, `Remote`, `File`, `Transfer`, `Patient`).
- Filter density: ~9k matching rows per 100k cursor range.

## The original query

A single `WHERE cursor > X LIMIT N` with the OR tree:

```sql
SELECT changelog.* FROM changelog
  LEFT JOIN store_view             ON ...
  LEFT JOIN store_view AS transfer_stores ON ...
  LEFT JOIN name_store_join_view   ON ...
  LEFT JOIN store_view AS patient_stores  ON ...
WHERE (
     (table_name IN <central> AND store_id IS NULL)
  OR (table_name IN <remote>  AND store_view.site_id = $site)
  OR (table_name IN <file>    AND store_id IS NULL)
  OR (table_name IN <transfer> AND transfer_stores.site_id = $site)
  OR (table_name IN <patient>  AND patient_stores.site_id = $site)
) AND source_site_id != $site AND cursor > $from
ORDER BY cursor LIMIT $n;
```

Postgres planned this as a parallel bitmap heap scan on `changelog` returning **~2.3M rows** (the OR could only push `table_name` and `store_id IS NULL` into the bitmap), then a hash-join against four `store_view` instances, then a top-N sort + LIMIT. The site-id branches reference *joined* columns, so the planner can't drive the scan from `cursor` and stop early at LIMIT — it has to materialise the whole filtered set first.

End-to-end **~710 ms**, growing linearly with `|changelog|`.

## What didn't work

- **Composite `(table_name, cursor)` index.** Useful for simple `WHERE table_name = X AND cursor > N`, but the planner won't pick it given the OR-with-joined-columns shape. No measurable change.
- **Replacing `store_view` (= `store JOIN name_link`) with plain `store`.** Flips the plan to cursor-driven (`changelog_pkey` becomes the access path) but exposes the patient-id join chain as the new bottleneck — `name_link` is hit once per row that has a non-null `patient_id`, ~93k iterations per call. Same wall time. Worth doing later as a clean-up; not the headline win on its own.
- **CTE-based "filter → max(cursor) per record_id → fetch by PK"** from the v7-prototype branch. That structure was about dedup speed and doesn't apply now that we don't dedup.

## What we shipped: cursor windows

`ChangelogRepository::query` now loops sub-queries instead of issuing one. Each iteration adds two predicates to the user's filter:

- `cursor > current_cursor`
- `cursor <= current_cursor + 100_000`

The application accumulates rows until it has the requested `limit` or until `current_cursor` reaches a snapshot of `max_cursor` taken at the start.

That single change moves the cursor range into an **index condition** on `changelog_pkey`:

```
Parallel Index Scan using changelog_pkey
  Index Cond: ((cursor > 100) AND (cursor <= 100100))
  Filter:     <full OR tree>
```

Postgres reads only that key range, joins the small result, and applies the OR filter to a bounded set. Per-window cost no longer scales with `|changelog|`.

## Benchmarks

`LIMIT 1000` against `aaa` (cursor max = 2.4M):

| Window size | Window 1 (cold) | Mid | Tail | Avg / window | Full sweep |
|---|---|---|---|---|---|
| Unbounded | — | — | — | — | **~710 ms** |
| 100k | 120 ms | 111 ms | 117 ms | **~115 ms** | ~24 × 115 = **2.9 s** |
| 500k | 358 ms | 279 ms | 274 ms | **~300 ms** | ~5 × 300 = **1.5 s** |

- **Per-call latency** (typical incremental sync — pick up from the previous cursor, fetch the next 1000): 100k wins, ~6× faster than unbounded. Density is high enough that one window almost always fills the limit.
- **Full-table cold sweep** (initialisation, walking everything): 500k wins, ~2× faster than 100k.

We picked **100k**. The optimisation goal is making typical sync calls cheap and predictable — the cold sweep happens once at initialisation, and an extra second there isn't worth degrading every steady-state call by 2.5×.

If both matter later, an adaptive window (start at 100k, double on empty windows up to a cap, shrink back after a hit) would split the difference. Flagged but not done.
