use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "fix_asset_log_reasons_postgres"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Previous migration wasn't correct for postgres, we need to re-create the column
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TABLE asset_log_reason rename column asset_log_status to asset_log_status_old;
                    ALTER TABLE asset_log_reason ADD COLUMN asset_log_status asset_log_status NOT NULL DEFAULT 'NOT_IN_USE';
                    UPDATE asset_log_reason SET asset_log_status = asset_log_status_old::asset_log_status;
                    ALTER TABLE asset_log_reason DROP COLUMN asset_log_status_old;
                "#
            )?;
        }

        Ok(())
    }
}
