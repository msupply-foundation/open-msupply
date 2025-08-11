use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_vvm_status_to_stocktake_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE stocktake_line ADD COLUMN vvm_status_id TEXT;
            "#
        )?;

        Ok(())
    }
}
