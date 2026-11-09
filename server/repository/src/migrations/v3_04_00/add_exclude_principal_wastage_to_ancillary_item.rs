use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_exclude_principal_wastage_to_ancillary_item"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE ancillary_item
                ADD COLUMN exclude_principal_wastage BOOLEAN NOT NULL DEFAULT FALSE;
            "#
        )?;

        Ok(())
    }
}
