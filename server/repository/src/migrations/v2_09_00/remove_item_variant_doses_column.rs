use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_item_variant_doses_column"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Dropped as not needed
        sql!(
            connection,
            r#"
                ALTER TABLE item_variant DROP COLUMN doses_per_unit; 
            "#
        )?;

        Ok(())
    }
}
