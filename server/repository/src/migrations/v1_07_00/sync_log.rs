use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "sync_log"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
        ALTER TABLE sync_log ADD integration_progress_total INTEGER;
        ALTER TABLE sync_log ADD integration_progress_done INTEGER; 
        "#,
        )?;

        Ok(())
    }
}
