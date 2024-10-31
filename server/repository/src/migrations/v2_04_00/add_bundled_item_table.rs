use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_bundled_item_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE bundled_item (
                    id TEXT NOT NULL PRIMARY KEY,
                    principal_item_variant_id TEXT NOT NULL REFERENCES item_variant(id),
                    bundled_item_variant_id TEXT NOT NULL REFERENCES item_variant(id),
                    ratio {DOUBLE} NOT NULL,
                    deleted_datetime {DATETIME}
                );
            "#
        )?;

        Ok(())
    }
}
