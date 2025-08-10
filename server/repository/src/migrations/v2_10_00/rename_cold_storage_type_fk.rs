use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "rename_cold_storage_type_fk.rs"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // For Postgres, drop and recreate foreign key constraints
        if cfg!(feature = "postgres") {
            let result = sql!(
                connection,
                r#"
                    ALTER TABLE location DROP CONSTRAINT IF EXISTS location_cold_storage_type_id_fkey;
                    ALTER TABLE item_variant DROP CONSTRAINT IF EXISTS item_variant_cold_storage_type_id_fkey;
                "#
            );
            if result.is_err() {
                log::warn!(
                    "Failed to drop FK constraint on location and item_variant tables: {:?}",
                    result
                );
            }

            sql!(
                connection,
                r#"
                    ALTER TABLE location ADD CONSTRAINT location_location_type_id_fkey FOREIGN KEY (location_type_id) REFERENCES location_type(id);
                    ALTER TABLE item_variant ADD CONSTRAINT item_variant_location_type_id_fkey FOREIGN KEY (location_type_id) REFERENCES location_type(id);
                "#
            )?;
        }
        Ok(())
    }
}
