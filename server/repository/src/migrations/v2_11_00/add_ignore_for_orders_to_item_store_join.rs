use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_ignore_for_orders_to_item_store_join"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE item_store_join ADD COLUMN ignore_for_orders BOOLEAN NOT NULL DEFAULT FALSE;

                UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'item_store_join';  
            "#,
        )?;

        Ok(())
    }
}
