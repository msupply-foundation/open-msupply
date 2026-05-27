-- Optional follow-up to seed_perf_properties.sqlite.sql.
--
-- Creates a functional index over the JSONB-extracted visit_date so the
-- existing `date` + `legacyJsonb` perf cases become "best case" JSON
-- performance — index seek for the filter, in-order traversal for the sort,
-- no per-row JSON parse at query time.
--
-- Scoped to perf_store_% rows via a partial index so real data isn't
-- indexed. Idempotent (IF NOT EXISTS). Drop with:
--   DROP INDEX IF EXISTS idx_perf_name_visit_date_jsonb;
--
-- Usage:
--   sqlite3 path/to/omsupply.sqlite < server/scripts/seed_perf_jsonb_indexes.sqlite.sql

BEGIN;

CREATE INDEX IF NOT EXISTS idx_perf_name_visit_date_jsonb
ON name (json_extract(properties_jsonb, '$.visit_date'))
WHERE id LIKE 'perf_store_%';

COMMIT;

ANALYZE name;
