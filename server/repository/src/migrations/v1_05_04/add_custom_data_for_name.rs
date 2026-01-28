use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_custom_data_for_name"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Update integration_datetime on facility/store type name records in sync_buffer
        // when server start, or on next sync these will be re-integrated
        sql!(
            connection,
            r#"
                ALTER TABLE name ADD COLUMN custom_data TEXT DEFAULT NULL;
                UPDATE sync_buffer SET integration_datetime = NULL 
                    WHERE record_id IN (SELECT id FROM name where name."type" IN ('FACILITY', 'STORE'));
            "#
        )?;

        Ok(())
    }
}
