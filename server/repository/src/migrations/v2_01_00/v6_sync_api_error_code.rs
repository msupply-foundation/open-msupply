use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "v6_sync_api_error_code"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE sync_api_error_code ADD VALUE IF NOT EXISTS 'V6_API_VERSION_INCOMPATIBLE';
                "#
            )?;
        }

        Ok(())
    }
}
