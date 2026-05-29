-- Wipe all perf-test data (dense + sparse). Identical across SQLite and
-- Postgres — same DELETE statements, both backends accept BEGIN/COMMIT.
--
-- Order matters on Postgres because FKs are enforced: property_v2_value
-- → name (via record_id), name_link → name, store → name_link. SQLite
-- doesn't enforce FKs by default but the same order works.
--
-- Used by perf_sql_test.py's seed lifecycle (between sizes in a sweep);
-- can also be run manually:
--     sqlite3 path/to/omsupply.sqlite < server/scripts/cleanup_perf.sql
--     psql "$DATABASE_URL" -f server/scripts/cleanup_perf.sql
BEGIN;

DELETE FROM property_v2_value  WHERE record_id LIKE 'perf_store_%';
DELETE FROM store              WHERE id LIKE 'perf_store_%';
DELETE FROM name_link          WHERE name_id LIKE 'perf_store_%';
DELETE FROM name               WHERE id LIKE 'perf_store_%';

-- Match by `property_id` rather than `id` so we catch rows that may have
-- been created with UUID ids elsewhere (e.g. via sync) — anything pointing
-- at our perf properties needs to go before we can drop them.
DELETE FROM property_v2_option WHERE property_id LIKE 'perf_propv2_%' OR property_id LIKE 'perf_sparse_propv2_%';
DELETE FROM property_v2_table  WHERE property_id LIKE 'perf_propv2_%' OR property_id LIKE 'perf_sparse_propv2_%';
DELETE FROM property_v2        WHERE id LIKE 'perf_propv2_%' OR id LIKE 'perf_sparse_propv2_%';
DELETE FROM name_property      WHERE id LIKE 'perf_np_%' OR id LIKE 'perf_sparse_np_%';
DELETE FROM property           WHERE id LIKE 'perf_prop_%' OR id LIKE 'perf_sparse_prop_%';

COMMIT;
