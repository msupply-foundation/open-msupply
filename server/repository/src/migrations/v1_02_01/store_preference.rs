use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "store_preference"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE store_preference ADD COLUMN om_program_module bool NOT NULL DEFAULT false;
            "#
        )?;

        Ok(())
    }
}
