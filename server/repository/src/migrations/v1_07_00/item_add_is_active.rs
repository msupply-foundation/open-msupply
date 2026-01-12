use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "item_add_is_active"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE item ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
            CREATE INDEX "index_item_is_active" ON "item" ("is_active");
        "#,
        )?;

        Ok(())
    }
}
