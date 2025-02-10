use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "frontend_plugins"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE frontend_plugin (
                    id TEXT NOT NULL PRIMARY KEY,
                    code TEXT NOT NULL,
                    entry_point TEXT NOT NULL,
                    types TEXT NOT NULL,
                    files TEXT NOT NULL
                );
            "#
        )?;

        if cfg!(feature = "postgres") {
            // Postgres changelog variant
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'frontend_plugin';
                "#
            )?;
        }

        Ok(())
    }
}
