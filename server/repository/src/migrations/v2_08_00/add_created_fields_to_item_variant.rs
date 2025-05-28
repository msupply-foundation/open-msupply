use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_created_fields_to_item_variant"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE item_variant ADD COLUMN created_datetime {DATETIME} NOT NULL DEFAULT {DEFAULT_TIMESTAMP};
                ALTER TABLE item_variant ADD COLUMN created_by TEXT;
            "#
        )?;
        Ok(())
    }
}
