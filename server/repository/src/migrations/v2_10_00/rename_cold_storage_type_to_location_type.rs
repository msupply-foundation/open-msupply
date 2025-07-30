use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "rename_cold_storage_type_to_location_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                    ALTER TABLE cold_storage_type RENAME TO location_type;

                    ALTER TABLE location RENAME COLUMN cold_storage_type_id TO location_type_id;
                    ALTER TABLE item_variant RENAME COLUMN cold_storage_type_id TO location_type_id;
                "#
        )?;
        // if cfg!(feature = "postgres") {}

        Ok(())
    }
}
