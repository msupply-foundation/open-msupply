use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "item_store_join_add_default_location_id"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE item_store_join ADD COLUMN default_location_id TEXT REFERENCES location(id);
            "#
        )?;

        // Force sync inorder to re-integrate item_store_join so default_location_id gets populated
        sql!(
            connection,
            r#"
                UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'item_store_join';
            "#
        )?;

        Ok(())
    }
}
