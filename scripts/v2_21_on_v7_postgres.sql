-- =============================================================================
-- Apply the v2.21.0 migration fragments to an EXISTING sync-v7 (3.0.0) PostgreSQL
-- datafile.  Companion to scripts/v2_20_on_v7_postgres.sql (see issue #12323).
--
-- WHY THIS SCRIPT EXISTS
-- ---------------------
-- The v2.21.0 fragments were merged into the sync-v7 branch AFTER existing COMS
-- datafiles had already been migrated to database version 3.0.0 (e.g. full
-- migration of OG stores).  The migration runner only runs a migration's
-- fragments when `migration_version >= database_version`
-- (server/repository/src/migrations/mod.rs).  Since 2.21.0 >= 3.0.0 is false,
-- the five 2.21.0 fragments are silently skipped on those datafiles.  The most
-- visible symptom is a startup panic loading the standard reports:
--     invalid input value for enum context_type: "STOCK_MOVEMENT"
-- (same failure class as #12439).  Re-initialising is expensive, so this script
-- applies the same changes by hand.
--
-- HOW TO USE
-- ----------
-- 1. BACK UP THE DATABASE FIRST.
-- 2. If the datafile is also missing the v2.20 fragments (e.g. no
--    `reason_option_type` value 'SHIPMENT_VARIANCE'), run
--    scripts/v2_20_on_v7_postgres.sql first.
-- 3. Run this file against the COMS database, stopping on the first error:
--        psql -d <database> -v ON_ERROR_STOP=1 -f v2_21_on_v7_postgres.sql
-- 4. The `migration_fragment_log` inserts at the end mark each fragment as run,
--    so the server won't try to re-run them once the runner fix lands.
--
-- TRANSACTIONS
-- ------------
-- This file is intentionally NOT wrapped in a single BEGIN/COMMIT.  `ALTER TYPE
-- ... ADD VALUE` cannot run inside a transaction block on older PostgreSQL, and a
-- newly added enum value cannot be used in the same transaction even where it
-- can (see migrations README "Migration fragments in transactions").  Each
-- statement here is individually idempotent and atomic, so running them
-- statement-by-statement is safe.
--
-- IDEMPOTENCY
-- -----------
-- Statements use IF NOT EXISTS / ADD VALUE IF NOT EXISTS (or guard DO blocks) so
-- the script is safe to re-run.
--
-- NOTE ON changelog_table_name
-- ----------------------------
-- The original v2.20/v2.21 fragments also ran
--     ALTER TYPE changelog_table_name ADD VALUE ...
-- for the new tables.  That is NOT replayed here: the v7 migration
-- `alter_changelog_table_for_sync_v7` dropped the `changelog_table_name` type
-- (`changelog.table_name` is plain TEXT on 3.0.0 datafiles), so those statements
-- would fail and are no longer needed.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. recreate_stock_relocation_table (schema)
-- -----------------------------------------------------------------------------
-- The original fragment drops the old-shape table (from the v2.20 fragment
-- `add_stock_relocation_table`) and recreates it with the final shape.  On an
-- affected datafile the old table usually never existed (the v2.20 fragments
-- were skipped too), but scripts/v2_20_on_v7_postgres.sql creates the old shape
-- if it was run first — so handle both: drop the old shape if present, then
-- create the final shape.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'stock_relocation'
                 AND column_name = 'from_stock_line_id') THEN
        -- Old (v2.20) shape: replay the original fragment's cleanup.
        DELETE FROM changelog WHERE table_name = 'stock_relocation';
        DROP TABLE stock_relocation;
        DROP TYPE stock_relocation_status;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_relocation_status') THEN
        CREATE TYPE stock_relocation_status AS ENUM ('NEW', 'CONFIRMED', 'FINALISED');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS stock_relocation (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store(id),
    stock_movement_number BIGINT NOT NULL,
    status stock_relocation_status NOT NULL,
    created_datetime TIMESTAMP NOT NULL,
    created_by TEXT NOT NULL,
    confirmed_datetime TIMESTAMP,
    finalised_datetime TIMESTAMP,
    comment TEXT
);

-- -----------------------------------------------------------------------------
-- 2. add_stock_relocation_line_table (schema)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_relocation_line (
    id TEXT NOT NULL PRIMARY KEY,
    stock_relocation_id TEXT NOT NULL REFERENCES stock_relocation(id),
    stock_line_id TEXT NOT NULL REFERENCES stock_line(id),
    destination_stock_line_id TEXT REFERENCES stock_line(id),
    source_location_id TEXT REFERENCES location(id),
    destination_location_id TEXT REFERENCES location(id),
    number_of_packs DOUBLE PRECISION NOT NULL DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- 3. add_help_document_table (schema)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS help_document (
    id TEXT NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    created_datetime TIMESTAMP NOT NULL,
    deleted_datetime TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 4. add_stock_movement_report_context (schema, PG enum)
-- -----------------------------------------------------------------------------
-- This is the fragment whose absence panics startup: StandardReports::load_reports
-- inserts the stock movement report with this context.
ALTER TYPE context_type ADD VALUE IF NOT EXISTS 'STOCK_MOVEMENT';

-- -----------------------------------------------------------------------------
-- 5. reprocess_options_for_shipment_variance (DATA, v7-adapted)
-- -----------------------------------------------------------------------------
-- The original fragment ran:
--     UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'options';
-- ...so options records are re-translated on next sync, making SHIPMENT_VARIANCE
-- reason options show up even where they had failed to integrate on an older
-- version.
--
-- That statement is a no-op on a v7 datafile: `rebuild_sync_buffer` repartitioned
-- `sync_buffer` BY LIST (is_integrated) and the pending query filters on
-- `is_integrated`, so `integration_datetime` alone no longer controls
-- re-integration.  The v7 equivalent below follows the pattern already used in
-- production by the v3.0.0 reintegrate_* fragments (e.g.
-- reintegrate_categories_for_custom_field_options): flipping `is_integrated`
-- moves the rows back to the pending partition.  Options records are few, so
-- this is cheap.
UPDATE sync_buffer
    SET is_integrated = FALSE,
        integration_datetime = NULL,
        integration_error = NULL
    WHERE table_name = 'options';

-- -----------------------------------------------------------------------------
-- Mark all five fragments as run so the migration runner skips them.
-- (version_and_identifier = '<migration version>-<fragment identifier>')
-- -----------------------------------------------------------------------------
INSERT INTO migration_fragment_log (version_and_identifier, datetime) VALUES
    ('2.21.0-recreate_stock_relocation_table', now()),
    ('2.21.0-add_stock_relocation_line_table', now()),
    ('2.21.0-add_help_document_table', now()),
    ('2.21.0-add_stock_movement_report_context', now()),
    ('2.21.0-reprocess_options_for_shipment_variance', now())
ON CONFLICT (version_and_identifier) DO NOTHING;
