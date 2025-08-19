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
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'VOLUME_PER_PACK_CHANGED';
                "#
            )?;
        }
        Ok(())
    }
}
