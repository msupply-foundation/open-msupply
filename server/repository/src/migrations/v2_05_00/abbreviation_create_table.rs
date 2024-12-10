use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "abbreviation_create_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE TABLE abbreviation (
                id TEXT NOT NULL PRIMARY KEY,
                abbreviation TEXT NOT NULL,
                expansion TEXT NOT NULL,
            );
        "#
        )?;

        Ok(())
    }
}
