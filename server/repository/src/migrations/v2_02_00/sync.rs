use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "sync"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE sync_log ADD duration_in_seconds INT DEFAULT 0 NOT NULL;
            "#,
        )?;

        Ok(())
    }
}
