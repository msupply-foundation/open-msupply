use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_variant_and_bundle_activity_log_types"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'ITEM_VARIANT_UPDATED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PACKAGING_VARIANT_CREATED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PACKAGING_VARIANT_UPDATED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PACKAGING_VARIANT_DELETED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'BUNDLED_ITEM_CREATED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'BUNDLED_ITEM_UPDATED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'BUNDLED_ITEM_DELETED';
                "#
            )?;
        }
        Ok(())
    }
}
