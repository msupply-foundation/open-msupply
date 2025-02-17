use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_program_id_to_stocktake"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE stocktake ADD COLUMN program_id TEXT
                REFERENCES program (id);
            "#
        )?;

        Ok(())
    }
}
