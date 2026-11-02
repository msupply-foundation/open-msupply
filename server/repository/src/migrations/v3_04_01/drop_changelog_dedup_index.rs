use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "drop_changelog_dedup_index"
    }

    // The 3.0 to 3.4 changelog dedup built this whole-table index at the start
    // of each run and dropped it at the end, so a server stopped mid-run keeps
    // it. The dedup now indexes per partition and never uses this one.
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(connection, "DROP INDEX IF EXISTS index_changelog_dedup;")?;
        Ok(())
    }
}
