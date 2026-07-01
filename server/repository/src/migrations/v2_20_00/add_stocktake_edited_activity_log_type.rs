use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_stocktake_edited_activity_log_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'STOCKTAKE_EDITED';
                "#
            )?;
        }
        Ok(())
    }
}
