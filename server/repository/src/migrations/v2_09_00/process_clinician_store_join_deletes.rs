use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "process_clinician_store_join_deletes"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // reprocess clinician visibility deletes as support now added for translating delete records
        sql!(
            connection,
            r#"
                UPDATE sync_buffer
                    SET integration_datetime = NULL
                    WHERE table_name = 'clinician_store_join';  
            "#
        )?;

        Ok(())
    }
}
