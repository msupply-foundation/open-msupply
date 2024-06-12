use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        // TODO migrate across from legacy field
        r#"
            ALTER TABLE item ADD COLUMN is_vaccine BOOLEAN NOT NULL DEFAULT FALSE;
            
            CREATE INDEX "index_item_is_vaccine" ON "item" ("is_vaccine");
        "#,
    )?;

    Ok(())
}
