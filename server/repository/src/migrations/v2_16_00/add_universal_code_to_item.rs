use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_universal_code_to_item"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE item ADD COLUMN universal_code TEXT;

                UPDATE sync_buffer
                SET integration_datetime = null
                WHERE table_name = 'item'; 
            "#
        )?;

        Ok(())
    }
}
