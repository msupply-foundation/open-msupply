use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "asset_log_reason_not_functioning_comments_required"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                UPDATE asset_log_reason
                SET comments_required = TRUE
                WHERE asset_log_status = 'NOT_FUNCTIONING';
            "#
        )?;

        Ok(())
    }
}
