use crate::migrations::*;
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "indicator_row_create_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Item variant Table
        sql!(
            connection,
            r#"
            CREATE TABLE indicator (
                id TEXT PRIMARY KEY NOT NULL,
                program_indicator_id TEXT NOT NULL REFERENCES program_indicator(id),
                index INTEGER NOT NULL,
                description TEXT NOT NULL,
                code TEXT NOT NULL,
                is_required BOOLEAN NOT NULL,
                is_active BOOLEAN NOT NULL,     
            );
            "#
        )?;
        Ok(())
    }
}
