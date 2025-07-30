use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_doses_columns_to_item_variant"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE item_variant ADD COLUMN doses_per_unit INTEGER NOT NULL DEFAULT 0;
                ALTER TABLE item_variant ADD COLUMN vvm_type TEXT;
            "#
        )?;

        Ok(())
    }
}
