use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "new_stocktake_fields"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE stocktake ADD COLUMN counted_by TEXT;
                ALTER TABLE stocktake ADD COLUMN verified_by TEXT;
            "#
        )?;

        Ok(())
    }
}
