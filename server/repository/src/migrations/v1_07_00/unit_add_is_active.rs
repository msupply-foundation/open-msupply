use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "unit_add_is_active"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE unit ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
            CREATE INDEX "index_unit_is_active" ON "unit" ("is_active");
        "#,
        )?;

        Ok(())
    }
}
