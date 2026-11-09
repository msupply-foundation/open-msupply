use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "drop_changelog_dedup_index"
    }

    // Left behind by 3.0 to 3.4 dedup runs that were stopped mid-run; nothing uses it.
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(connection, "DROP INDEX IF EXISTS index_changelog_dedup;")?;
        Ok(())
    }
}
