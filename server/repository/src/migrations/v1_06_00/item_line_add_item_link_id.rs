use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE stock_line
        ADD COLUMN item_link_id TEXT NOT NULL REFERENCES item_link(id);
        "#,
    )?;

    Ok(())
}
