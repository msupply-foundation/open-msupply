use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_comments_required_to_asset_log_reason"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                ALTER TABLE asset_log_reason ADD COLUMN IF NOT EXISTS comments_required BOOLEAN NOT NULL DEFAULT FALSE;
            "#
        )?;

        #[cfg(feature = "sqlite")]
        sql!(
            connection,
            r#"
                ALTER TABLE asset_log_reason ADD COLUMN IF NOT EXISTS comments_required BOOLEAN NOT NULL DEFAULT 0;
            "#
        )?;

        Ok(())
    }
}
