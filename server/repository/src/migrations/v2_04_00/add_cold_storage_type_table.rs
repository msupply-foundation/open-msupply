use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_cold_storage_type_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE cold_storage_type (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL,
                    min_temperature {DOUBLE},
                    max_temperature {DOUBLE}
                );
            "#
        )?;

        sql!(
            connection,
            r#"
                ALTER TABLE location
                ADD COLUMN cold_storage_type_id TEXT
                REFERENCES cold_storage_type(id);
            "#
        )?;

        Ok(())
    }
}
