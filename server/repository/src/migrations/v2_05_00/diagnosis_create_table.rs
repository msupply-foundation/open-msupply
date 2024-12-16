use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "diagnosis_create_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE TABLE diagnosis (
                id TEXT NOT NULL PRIMARY KEY,
                code TEXT NOT NULL,
                description NOT NULL,
                notes TEXT,
                valid_till DATE
            );
        "#
        )?;

        Ok(())
    }
}
