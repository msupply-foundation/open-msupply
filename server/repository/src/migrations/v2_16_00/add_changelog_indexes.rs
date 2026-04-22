use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_changelog_indexes"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE INDEX IF NOT EXISTS index_changelog_record_id_store_id_cursor_desc
                    ON changelog (record_id ASC, store_id ASC, cursor DESC);

                CREATE INDEX IF NOT EXISTS index_changelog_cursor
                    ON changelog (cursor DESC);
            "#
        )?;

        Ok(())
    }
}
