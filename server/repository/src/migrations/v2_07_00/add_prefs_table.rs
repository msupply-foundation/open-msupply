use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_prefs_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE prefs (
                    id TEXT NOT NULL PRIMARY KEY,
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    store_id TEXT REFERENCES store(id)
                );
            "#
        )?;

        Ok(())
    }
}
