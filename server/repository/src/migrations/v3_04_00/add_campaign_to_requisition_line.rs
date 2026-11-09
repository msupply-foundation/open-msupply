use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_campaign_to_requisition_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE requisition_line ADD COLUMN campaign_id TEXT REFERENCES campaign(id);
            "#
        )?;

        Ok(())
    }
}
