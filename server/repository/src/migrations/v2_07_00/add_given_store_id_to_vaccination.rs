use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_given_store_id_to_vaccination"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE vaccination ADD COLUMN given_store_id TEXT;

                UPDATE vaccination SET given_store_id = store_id WHERE given = TRUE;
            "#
        )?;

        Ok(())
    }
}
