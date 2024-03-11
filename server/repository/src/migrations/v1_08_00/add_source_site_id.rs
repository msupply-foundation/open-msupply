use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            ALTER TABLE changelog ADD COLUMN source_site_id TEXT;
            ALTER TABLE sync_buffer ADD COLUMN source_site_id TEXT;
        "#
    )?;

    // Add the new source_site_id to the changelog_deduped view
    sql!(
        connection,
        r#"
        DROP VIEW changelog_deduped;

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
            ORDER BY c.cursor;
        "#
    )?;

    Ok(())
}
