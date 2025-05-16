use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_donor_id_to_stocktake_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE stocktake_line ADD COLUMN donor_link_id TEXT;
            "#
        )?;

        Ok(())
    }
}
