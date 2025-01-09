use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_example_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE example_table (
                    id TEXT NOT NULL PRIMARY KEY,
                    data TEXT NOT NULL
                );
            "#
        )?;

        if cfg!(feature = "postgres") {
            // Postgres changelog variant
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'example_table';
                "#
            )?;
        }

        Ok(())
    }
}
