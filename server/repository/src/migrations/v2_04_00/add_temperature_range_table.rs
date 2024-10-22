use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_temperature_range_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE IF NOT EXISTS temperature_range (
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
                ADD COLUMN IF NOT EXISTS temperature_range_id TEXT
                REFERENCES temperature_range(id);
            "#
        )?;

        Ok(())
    }
}
