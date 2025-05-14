use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_dynamic_cursor_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE dynamic_cursor (
                    id TEXT NOT NULL PRIMARY KEY,
                    cursor_value BIGINT NOT NULL
                );
            "#
        )?;

        Ok(())
    }
}
