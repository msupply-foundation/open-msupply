use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_store_id_to_clinician"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // reintegrate clinician sync records to apply new store id column
        sql!(
            connection,
            r#"
                ALTER TABLE clinician ADD COLUMN store_id TEXT REFERENCES store(id);

                UPDATE sync_buffer
                    SET integration_datetime = NULL
                    WHERE table_name = 'clinician';  
            "#
        )?;

        Ok(())
    }
}
