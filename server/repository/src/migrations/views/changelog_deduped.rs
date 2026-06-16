use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS changelog_deduped;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                -- Most recent change per row only (an insert + delete shows as an orphaned delete).
    -- Dedupe by (record_id, store_id) so store transfers (e.g. assets) aren't lost.
    -- "Keep the row with no newer row for the same key" (NOT EXISTS anti-join) is equivalent to the
    -- old GROUP BY MAX(cursor) self-join (cursor is unique), but lets the planner push a
    -- `WHERE cursor >= ?` down to the cursor index instead of deduping the whole changelog first -
    -- turning per-batch sync queries on a large changelog from a full scan into a tail scan.
  CREATE VIEW changelog_deduped AS
    SELECT c.cursor,
        c.table_name,
        c.record_id,
        c.row_action,
        c.name_link_id,
        name_link.name_id,
        c.store_id,
        c.is_sync_update,
        c.source_site_id
    FROM changelog c
    LEFT JOIN name_link ON c.name_link_id = name_link.id
    WHERE NOT EXISTS (
        SELECT 1
        FROM changelog newer
        WHERE newer.record_id = c.record_id
            AND (newer.store_id = c.store_id OR (newer.store_id IS NULL AND c.store_id IS NULL))
            AND newer.cursor > c.cursor
    )
    ORDER BY c.cursor;            "#
        )?;

        Ok(())
    }
}
