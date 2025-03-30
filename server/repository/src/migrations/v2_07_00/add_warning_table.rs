use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_warning_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE warning (
                    id TEXT NOT NULL PRIMARY KEY,
                    warning_text TEXT NOT NULL,
                    code TEXT NOT NULL,
                );
            "#
        )?;

        Ok(())
    }
}
