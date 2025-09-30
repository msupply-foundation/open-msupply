use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "rename_cold_storage_type_activity_log_enum"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                // Adding INVOICE_STATUS_CANCELLED as well, test surfaced that this was missing in postgres
                r#"

                 ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'INVOICE_STATUS_CANCELLED';
                 ALTER TYPE activity_log_type RENAME VALUE 'ITEM_VARIANT_UPDATE_COLD_STORAGE_TYPE' TO 'ITEM_VARIANT_UPDATE_LOCATION_TYPE';
                 "#,
            )?;
        } else {
            sql!(
                connection,
                r#"
                UPDATE activity_log SET type = 'ITEM_VARIANT_UPDATE_LOCATION_TYPE' WHERE type = 'ITEM_VARIANT_UPDATE_COLD_STORAGE_TYPE';
            "#,
            )?;
        }

        Ok(())
    }
}
