use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_volume_to_location"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE location ADD COLUMN volume {DOUBLE};
            "#
        )?;

        Ok(())
    }
}
