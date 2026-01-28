use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "drop_item_is_visible_view"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(connection, r#"DROP VIEW IF EXISTS item_is_visible;"#)?;

        Ok(())
    }
}
