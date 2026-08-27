use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_item_variant_enums_to_activity_log"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'ITEM_VARIANT_CREATED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'ITEM_VARIANT_DELETED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'ITEM_VARIANT_UPDATED_NAME';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'ITEM_VARIANT_UPDATE_COLD_STORAGE_TYPE';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'ITEM_VARIANT_UPDATE_MANUFACTURER';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'ITEM_VARIANT_UPDATE_DOSE_PER_UNIT';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'ITEM_VARIANT_UPDATE_VVM_TYPE';
                "#
            )?;
        }
        Ok(())
    }
}
