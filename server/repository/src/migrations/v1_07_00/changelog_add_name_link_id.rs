use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        DROP INDEX index_changelog_record_id;
        DROP VIEW changelog_deduped;
        "#
    )?;

    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"        
        -- Triggers need to be disabled for these tables to avoid setting them off before
        -- their functions referring to the old changelog.name_id field is updated to changelog.name_link_id.
        -- They are enabled again in each tables' migration in for merging where the functions are updated.
        ALTER TABLE invoice DISABLE TRIGGER ALL;
        ALTER TABLE invoice_line DISABLE TRIGGER ALL;
        ALTER TABLE requisition DISABLE TRIGGER ALL;
        ALTER TABLE requisition_line DISABLE TRIGGER ALL;
        ALTER TABLE name_store_join DISABLE TRIGGER ALL;

        -- Adding changelog.name_link_id
        ALTER TABLE changelog
        RENAME COLUMN name_id to name_link_id;
                        
        ALTER TABLE changelog ADD CONSTRAINT changelog_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES name_link(id);
        "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        DROP TRIGGER name_store_join_insert_trigger;
        DROP TRIGGER name_store_join_update_trigger;
        DROP TRIGGER invoice_insert_trigger;
        DROP TRIGGER invoice_update_trigger;
        DROP TRIGGER invoice_delete_trigger;
        DROP TRIGGER invoice_line_insert_trigger;
        DROP TRIGGER invoice_line_update_trigger;
        DROP TRIGGER invoice_line_delete_trigger;
        DROP TRIGGER requisition_insert_trigger;
        DROP TRIGGER requisition_update_trigger;
        DROP TRIGGER requisition_delete_trigger;
        DROP TRIGGER requisition_line_insert_trigger;
        DROP TRIGGER requisition_line_update_trigger;
        DROP TRIGGER requisition_line_delete_trigger;
        
        -- Adding changelog.name_link_id

        CREATE TABLE tmp_changelog AS SELECT * FROM changelog;
        DROP TABLE changelog;
        CREATE TABLE changelog (
            cursor INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            -- the table name where the change happened
            table_name TEXT NOT NULL,
            -- row id of the modified row
            record_id TEXT NOT NULL,
            row_action TEXT NOT NULL,
            -- Below fields are extracted from associated record where it's deemed necessary (see changelog/README.md)
            name_link_id TEXT REFERENCES name_link(id), -- RENAMED from name_id
            store_id TEXT,
            is_sync_update BOOLEAN NOT NULL DEFAULT FALSE
        );
        INSERT INTO changelog SELECT * FROM tmp_changelog;
        DROP TABLE tmp_changelog;
     "#,
    )?;

    sql!(
        connection,
        r#"
        DROP INDEX IF EXISTS "index_changelog_name_id_fkey";
        CREATE INDEX "index_changelog_name_link_id_fkey" ON "changelog" ("name_link_id");

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
                c.is_sync_update
            FROM (
                SELECT record_id, MAX(cursor) AS max_cursor
                FROM changelog
                GROUP BY record_id
            ) grouped
            INNER JOIN changelog c
                ON c.record_id = grouped.record_id AND c.cursor = grouped.max_cursor
            ORDER BY c.cursor;
    
        CREATE INDEX index_changelog_record_id ON changelog (record_id);
        "#
    )?;

    Ok(())
}
