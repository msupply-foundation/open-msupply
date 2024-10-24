use crate::migrations::*;
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "program_indicator_create_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Item variant Table
        sql!(
            connection,
            r#"
            CREATE TABLE program_indicator (
                id TEXT PRIMARY KEY NOT NULL,
                program_id TEXT NOT NULL REFERENCES program(id),
                code TEXT,
                is_active NOT NULL DEFAULT TRUE           
            );
            "#
        )?;
        Ok(())
    }
}
