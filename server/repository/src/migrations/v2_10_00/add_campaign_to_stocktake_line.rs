use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_campaign_id_to_stocktake_line_row"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE stocktake_line ADD COLUMN campaign_id TEXT REFERENCES campaign(id);
            "#
        )?;

        Ok(())
    }
}
