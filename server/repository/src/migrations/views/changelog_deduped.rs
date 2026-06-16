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
                -- View of the changelog that only contains the most recent changes to a row, i.e. previous row
    -- edits are removed.
    -- Note, an insert + delete will show up as an orphaned delete.
    -- For records that can be transferred between stores (like assets), we dedupe by both
    -- record_id and store_id so changes are not lost when an asset is moved.
    --
    -- This is expressed as "keep the row that has no newer row for the same (record_id, store_id)"
    -- (a NOT EXISTS anti-join) rather than the equivalent GROUP BY ... MAX(cursor) self-join.
    -- Both produce the same rows (cursor is unique), but the anti-join form lets the query planner
    -- push a caller's `WHERE cursor >= ?` predicate down to the base table's cursor index instead of
    -- deduping the entire changelog first. On a large changelog (e.g. a central server) this turns
    -- the per-batch sync push/pull queries from a full-table dedup into a tail scan.
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
