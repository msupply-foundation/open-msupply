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

        Ok(())
    }
}
