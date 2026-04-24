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
                og_id TEXT,
                code TEXT NOT NULL DEFAULT '',
                name TEXT NOT NULL,
                hashed_password TEXT NOT NULL DEFAULT '',
                hardware_id TEXT,
                token TEXT
            );
            "#
        )?;

        Ok(())
    }
}
