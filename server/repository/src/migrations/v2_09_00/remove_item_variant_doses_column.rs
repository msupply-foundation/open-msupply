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

        // When OMS Central is on 2.9+ doses per unit column has been removed
        // When remote is on 2.8 doses per unit is a required field
        // This would have resulted in sync errors because expected field is not found
        // Let's reintegrate item variant now that remote site is on 2.9
        sql!(
            connection,
            r#"
                 UPDATE sync_buffer
                    SET integration_datetime = NULL
                    WHERE table_name = 'item_variant';  
            "#
        )?;

        Ok(())
    }
}
