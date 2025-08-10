use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "rename_vvm_status_level_to_priority"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
               ALTER TABLE vvm_status RENAME COLUMN level TO priority;
            "#
        )?;

        Ok(())
    }
}
