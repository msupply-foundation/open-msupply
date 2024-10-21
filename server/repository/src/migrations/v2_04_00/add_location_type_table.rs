use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_location_type_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE IF NOT EXISTS location_type (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL,
                    min_temperature REAL,
                    max_temperature REAL
                );
            "#
        )?;

        sql!(
            connection,
            r#"
                ALTER TABLE location
                ADD COLUMN IF NOT EXISTS location_type_id TEXT
                REFERENCES location_type(id);
            "#
        )?;

        Ok(())
    }
}
