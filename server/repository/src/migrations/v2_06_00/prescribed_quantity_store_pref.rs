use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "prescribed_quantity_store_pref"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE store_preference ADD 
                edit_prescribed_quantity_on_prescription
                BOOLEAN NOT NULL DEFAULT FALSE;
            "#
        )?;

        Ok(())
    }
}
