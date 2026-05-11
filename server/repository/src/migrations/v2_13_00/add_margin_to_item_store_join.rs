use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_margin_to_item_store_join"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE item_store_join ADD COLUMN margin {DOUBLE} NOT NULL DEFAULT 0.0;
            "#,
        )?;

        Ok(())
    }
}
