use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "printer_configuration_create_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE TABLE printer_configuration (
                id TEXT NOT NULL PRIMARY KEY,
                description TEXT NOT NULL,
                address TEXT NOT NULL,
                port INTEGER NOT NULL,
                label_width INTEGER NOT NULL,
                label_height INTEGER NOT NULL
            );
        "#
        )?;

        Ok(())
    }
}
