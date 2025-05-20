use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_able_to_specify_vvm_status_when_receiving_items_pref"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE store_preference ADD 
                able_to_specify_vvm_status_when_receiving_items 
                BOOLEAN NOT NULL DEFAULT FALSE;
            "#
        )?;

        Ok(())
    }
}
