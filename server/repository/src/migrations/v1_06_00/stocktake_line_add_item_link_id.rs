use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        -- Adding stocktake_line.item_link_id
        PRAGMA foreign_keys = OFF;

        ALTER TABLE stocktake_line
        ADD COLUMN item_link_id TEXT NOT NULL REFERENCES item_link (id) DEFAULT 'temp_for_migration'; 

        UPDATE stocktake_line
        SET item_link_id = item_id;

        PRAGMA foreign_keys = ON;

        DROP INDEX IF EXISTS index_stocktake_line_item_id_fkey;
        ALTER TABLE stocktake_line
        DROP COLUMN item_id;
        
        CREATE INDEX "index_stocktake_line_item_link_id_fkey" ON "stocktake_line" ("item_link_id");
        "#,
    )?;

    Ok(())
}
