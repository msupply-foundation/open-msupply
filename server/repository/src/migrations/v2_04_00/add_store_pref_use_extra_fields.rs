use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_store_pref_use_extra_fields"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE store_preference ADD extra_fields_in_requisition BOOLEAN NOT NULL DEFAULT FALSE;
                "#
        )?;

        Ok(())
    }
}
