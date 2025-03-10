use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_preference_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE preference (
                    id TEXT NOT NULL PRIMARY KEY,
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    store_id TEXT REFERENCES store(id)
                );
            "#
        )?;

        if cfg!(feature = "postgres") {
            // Postgres changelog variant
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'preference';
                "#
            )?;
        }

        Ok(())
    }
}
