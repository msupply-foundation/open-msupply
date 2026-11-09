use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_kind_to_campaign"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE campaign ADD COLUMN kind TEXT NOT NULL DEFAULT 'campaign';
            "#
        )?;

        Ok(())
    }
}
