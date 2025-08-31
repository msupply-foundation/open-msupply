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
  CREATE VIEW changelog_deduped AS
    SELECT c.cursor,
        c.table_name,
        c.record_id,
        c.row_action,
        c.name_link_id,
        c.store_id,
        c.is_sync_update,
        c.source_site_id
    FROM (
        SELECT record_id, MAX(cursor) AS max_cursor
        FROM changelog
        GROUP BY record_id
    ) grouped
    INNER JOIN changelog c
        ON c.record_id = grouped.record_id AND c.cursor = grouped.max_cursor
    ORDER BY c.cursor;            "#
        )?;

        Ok(())
    }
}
