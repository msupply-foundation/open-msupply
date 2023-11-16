use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        PRAGMA foreign_keys = OFF;
        ALTER TABLE stock_line ADD COLUMN item_link_id TEXT NOT NULL REFERENCES item_link(id);
        UPDATE stock_line SET item_link_id = item_id;   
        PRAGMA foreign_keys = ON;
        ALTER TABLE stock_line DROP COLUMN item_id;
        "#,
    )?;

    Ok(())
}
