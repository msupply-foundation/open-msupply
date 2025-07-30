use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_restricted_location_type_id_to_item"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE item ADD COLUMN restricted_location_type_id TEXT REFERENCES location_type(id);
                
                UPDATE sync_buffer
                SET integration_datetime = NULL
                WHERE table_name = 'item'; 
                
            "#
        )?;

        Ok(())
    }
}
