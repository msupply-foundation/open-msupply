use crate::migrations::*;
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "indicator_column_create_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Item variant Table
        sql!(
            connection,
            r#"
            CREATE TABLE indicator_column (
                id TEXT PRIMARY KEY NOT NULL,
                program_indicator_id TEXT NOT NULL REFERENCES program_indicator(id),
                index INTEGER NOT NULL,
                header TEXT NOT NULL,
                value_type TEXT NOT NULL,
                default_value TEXT NOT NULL,
                is_active BOOLEAN NOT NULL,       
            );
            "#
        )?;
        Ok(())
    }
}
