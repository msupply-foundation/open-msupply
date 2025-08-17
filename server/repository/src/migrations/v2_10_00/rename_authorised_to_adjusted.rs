use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "rename_authorised_to_adjusted_number_of_units"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Rename the column from authorised_number_of_units to adjusted_number_of_units
        sql!(
            connection,
            r#"
            ALTER TABLE purchase_order_line 
            RENAME COLUMN authorised_number_of_units TO adjusted_number_of_units;
            "#
        )?;



        Ok(())
    }
}
