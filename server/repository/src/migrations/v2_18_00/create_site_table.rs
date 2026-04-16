use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "create_site_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE TABLE site (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                hashed_password TEXT NOT NULL DEFAULT '',
                hardware_id TEXT,
                token TEXT
            );
            "#
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'site';
                "#
            )?;
        }

        Ok(())
    }
}
