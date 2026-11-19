use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_stock_campaign_change_activity_log_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'STOCK_CAMPAIGN_CHANGE';
                "#
            )?;
        }
        Ok(())
    }
}
