use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_sync_batch_size_key_value_store"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SETTINGS_SYNC_BATCH_SIZE_REMOTE_PULL';
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SETTINGS_SYNC_BATCH_SIZE_REMOTE_PUSH';
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SETTINGS_SYNC_BATCH_SIZE_CENTRAL_PULL';
                "#
            )?;
        }

        Ok(())
    }
}
