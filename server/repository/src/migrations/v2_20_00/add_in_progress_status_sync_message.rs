use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_in_progress_status_sync_message"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE sync_message_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
                "#
            )?;
        }

        Ok(())
    }
}
