-- =============================================================================
-- Apply the v2.20.0 migration fragments to an EXISTING sync-v7 (3.0.0) PostgreSQL
-- datafile.  See: https://github.com/msupply-foundation/open-msupply/issues/12323
--
-- WHY THIS SCRIPT EXISTS
-- ---------------------
-- The v2.20.0 fragments were merged into the sync-v7 branch AFTER existing COMS
-- datafiles had already been migrated to database version 3.0.0 (e.g. full
-- migration of OG stores).  The migration runner only runs a migration's
-- fragments when `migration_version >= database_version`
-- (server/repository/src/migrations/mod.rs).  Since 2.20.0 >= 3.0.0 is false,
-- the twelve 2.20.0 fragments are silently skipped on those datafiles, so the
-- 2.20 schema/data is missing.  Re-initialising is expensive, so this script
-- applies the same changes by hand.
--
-- HOW TO USE
-- ----------
-- 1. BACK UP THE DATABASE FIRST.
-- 2. Run this file against the COMS database, stopping on the first error:
--        psql -d <database> -v ON_ERROR_STOP=1 -f v2_20_on_v7_postgres.sql
-- 3. The `migration_fragment_log` inserts at the end mark each fragment as run,
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
-- Statements use IF NOT EXISTS / ADD VALUE IF NOT EXISTS so the script is safe to
-- re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. add_plugin_data_indexes (schema)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS index_plugin_data_data_identifier
    ON plugin_data (data_identifier);
CREATE INDEX IF NOT EXISTS index_plugin_data_plugin_code_data_identifier
    ON plugin_data (plugin_code, data_identifier);

-- -----------------------------------------------------------------------------
-- 2. add_plugin_data_datetime_field (schema + DATA)
-- -----------------------------------------------------------------------------
ALTER TABLE plugin_data ADD COLUMN IF NOT EXISTS datetime TIMESTAMP;

CREATE INDEX IF NOT EXISTS index_plugin_data_datetime
    ON plugin_data (datetime)
    WHERE datetime IS NOT NULL;

-- !!! DATA MIGRATION - NEEDS REVIEW ON SYNC V7 !!!
-- The original fragment ran:
--     UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'plugin_data';
-- ...to force plugin_data records to be re-translated on next sync, so the new
-- `datetime` column gets populated from the source payload.
--
-- This is NOT safe to copy verbatim on a v7 datafile, because the v7
-- `rebuild_sync_buffer` migration repartitioned `sync_buffer` BY LIST (is_integrated),
-- where `is_integrated` was derived from `integration_datetime IS NOT NULL`.
-- Nulling `integration_datetime` on already-integrated (archive partition) rows
-- would leave is_integrated=TRUE with integration_datetime=NULL, an inconsistent
-- state, and would not actually move the rows back to the pending partition for
-- re-translation.  The correct v7 equivalent (flip is_integrated, move the row to
-- the pending partition, clear integration timestamps) still needs to be designed
-- - see issue #12323.  Left out deliberately; `plugin_data.datetime` will simply
-- stay NULL on existing rows until that is sorted.

-- -----------------------------------------------------------------------------
-- 3. add_support_upload_files_processor_cursor_key_value_store (schema, PG enum)
-- -----------------------------------------------------------------------------
ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SUPPORT_UPLOAD_FILES_PROCESSOR_CURSOR';

-- -----------------------------------------------------------------------------
-- 4. add_in_progress_and_error_statuses_sync_message (schema, PG enum)
-- -----------------------------------------------------------------------------
ALTER TYPE sync_message_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE sync_message_status ADD VALUE IF NOT EXISTS 'ERROR';

-- -----------------------------------------------------------------------------
-- 5. add_variant_and_bundle_activity_log_types (schema, PG enum)
-- -----------------------------------------------------------------------------
ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'ITEM_VARIANT_UPDATED';
ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PACKAGING_VARIANT_CREATED';
ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PACKAGING_VARIANT_UPDATED';
ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PACKAGING_VARIANT_DELETED';
ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'BUNDLED_ITEM_CREATED';
ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'BUNDLED_ITEM_UPDATED';
ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'BUNDLED_ITEM_DELETED';

-- -----------------------------------------------------------------------------
-- 6. add_stocktake_edited_activity_log_type (schema, PG enum)
-- -----------------------------------------------------------------------------
ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'STOCKTAKE_EDITED';

-- -----------------------------------------------------------------------------
-- 7. add_received_number_of_packs_to_invoice_line (schema)
-- -----------------------------------------------------------------------------
ALTER TABLE invoice_line ADD COLUMN IF NOT EXISTS received_number_of_packs DOUBLE PRECISION;

-- -----------------------------------------------------------------------------
-- 8. add_linked_invoice_line_id_to_invoice_line (schema + DATA)
-- -----------------------------------------------------------------------------
ALTER TABLE invoice_line ADD COLUMN IF NOT EXISTS linked_invoice_line_id TEXT;

-- !!! DATA MIGRATION - NEEDS REVIEW ON SYNC V7 !!!
-- The original fragment backfilled `invoice_line.linked_invoice_line_id` by
-- reading every `trans_line` UPSERT record out of `sync_buffer`, parsing the
-- legacy `linked_trans_line_ID` field from its JSON `data`, and setting it on the
-- matching invoice_line (matched on sync_buffer.record_id = invoice_line.id).
--
-- Caveats on a v7 datafile (review before enabling):
--   * v7 `rebuild_sync_buffer` changed `sync_buffer.action` from the `sync_action`
--     enum to TEXT, so the filter compares against the TEXT 'UPSERT'.
--   * Integrated trans_line rows live in the `sync_buffer_archive` partition;
--     `sync_buffer` (the parent) still selects across all partitions, so they are
--     reachable.
--   * If sync_buffer was ever pruned on this site, some trans_line rows may be
--     gone and those invoice_lines simply won't be backfilled.
--
-- The equivalent set-based statement (uncomment after review):
--
-- UPDATE invoice_line il
-- SET linked_invoice_line_id = sb.data::json ->> 'linked_trans_line_ID'
-- FROM sync_buffer sb
-- WHERE sb.record_id = il.id
--   AND sb.table_name = 'trans_line'
--   AND sb.action = 'UPSERT'
--   AND COALESCE(sb.data::json ->> 'linked_trans_line_ID', '') <> '';

-- -----------------------------------------------------------------------------
-- 9. add_shipment_variance_reason_option_type (schema, PG enum)
-- -----------------------------------------------------------------------------
ALTER TYPE reason_option_type ADD VALUE IF NOT EXISTS 'SHIPMENT_VARIANCE';

-- -----------------------------------------------------------------------------
-- 10. add_invoice_received_qty_updated_activity_log_type (schema, PG enum)
-- -----------------------------------------------------------------------------
ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'INVOICE_RECEIVED_QTY_UPDATED';

-- -----------------------------------------------------------------------------
-- 11. add_stock_relocation_table (schema)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_relocation_status') THEN
        CREATE TYPE stock_relocation_status AS ENUM ('NEW', 'FINALISED');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS stock_relocation (
    id TEXT NOT NULL PRIMARY KEY,
    created_datetime TIMESTAMP NOT NULL,
    finalised_datetime TIMESTAMP,
    from_stock_line_id TEXT NOT NULL REFERENCES stock_line(id),
    from_location_id TEXT REFERENCES location(id),
    from_number_of_packs DOUBLE PRECISION NOT NULL DEFAULT 0,
    to_stock_line_id TEXT REFERENCES stock_line(id),
    to_location_id TEXT REFERENCES location(id),
    to_pack_size DOUBLE PRECISION,
    status stock_relocation_status NOT NULL,
    store_id TEXT NOT NULL REFERENCES store(id),
    user_id TEXT NOT NULL
);

ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'stock_relocation';

-- -----------------------------------------------------------------------------
-- 12. add_item_store_join_indexes (schema)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS index_item_store_join_item_link_id_store_id
    ON item_store_join (item_link_id, store_id);

-- -----------------------------------------------------------------------------
-- Mark all twelve fragments as run so the migration runner skips them.
-- (version_and_identifier = '<migration version>-<fragment identifier>')
-- -----------------------------------------------------------------------------
INSERT INTO migration_fragment_log (version_and_identifier, datetime) VALUES
    ('2.20.0-add_plugin_data_indexes', now()),
    ('2.20.0-add_plugin_data_datetime_field', now()),
    ('2.20.0-add_support_upload_files_processor_cursor_key_value_store', now()),
    ('2.20.0-add_in_progress_and_error_statuses_sync_message', now()),
    ('2.20.0-add_variant_and_bundle_activity_log_types', now()),
    ('2.20.0-add_stocktake_edited_activity_log_type', now()),
    ('2.20.0-add_received_number_of_packs_to_invoice_line', now()),
    ('2.20.0-add_linked_invoice_line_id_to_invoice_line', now()),
    ('2.20.0-add_shipment_variance_reason_option_type', now()),
    ('2.20.0-add_invoice_received_qty_updated_activity_log_type', now()),
    ('2.20.0-add_stock_relocation_table', now()),
    ('2.20.0-add_item_store_join_indexes', now())
ON CONFLICT (version_and_identifier) DO NOTHING;
