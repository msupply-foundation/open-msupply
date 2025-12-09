use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_store_id_to_asset_internal_location"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                    ALTER TABLE asset_internal_location ADD COLUMN store_id TEXT NULL;
                "#
        )?;

        Ok(())
    }
}
