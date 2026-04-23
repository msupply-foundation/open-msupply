use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_invoice_migrated_from_legacy_log_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'INVOICE_MIGRATED_FROM_LEGACY';
                "#
            )?;
        }

        Ok(())
    }
}
