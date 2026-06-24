use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_changelog_dead_log"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Diagnostics log for the scheduled changelog dedup task: one row per
        // delete batch.
        if !cfg!(feature = "postgres") {
            return Ok(());
        }

        sql!(
            connection,
            r#"
            CREATE TABLE IF NOT EXISTS changelog_dead_log (
                id BIGSERIAL PRIMARY KEY,
                logged_at TIMESTAMPTZ DEFAULT clock_timestamp(),
                deleted_batch INTEGER,
                deleted_total BIGINT
            );
            "#
        )?;

        Ok(())
    }
}
