use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            ALTER TABLE item ADD COLUMN is_vaccine BOOLEAN NOT NULL DEFAULT FALSE;
            CREATE INDEX "index_item_is_vaccine" ON "item" ("is_vaccine");
        "#,
    )?;

    // Reset translate all items on the next sync
    sql!(
        connection,
        r#"
            UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'item';
        "#,
    )?;

    Ok(())
}
