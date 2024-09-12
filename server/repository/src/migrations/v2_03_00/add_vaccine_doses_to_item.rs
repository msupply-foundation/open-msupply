use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_vaccine_doses_to_item"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE item ADD COLUMN vaccine_doses INTEGER NOT NULL DEFAULT 0;
            "#
        )?;

        // Reset translate all items on the next sync
        sql!(
            connection,
            r#"
                UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'item';
            "#,
        )?;

        Ok(())
    }
}
