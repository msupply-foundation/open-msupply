use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_shipping_method_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE shipping_method (
                    id TEXT NOT NULL PRIMARY KEY, 
                    method TEXT NOT NULL, 
                    deleted_datetime {DATETIME}
                );
            "#
        )?;

        Ok(())
    }
}
