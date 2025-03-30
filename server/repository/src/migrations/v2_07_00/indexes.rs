use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "item_warning_link_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
        CREATE INDEX index_item_warning_link_item_id ON item_warning_link (item_id);        
        "#,
        )?;

        Ok(())
    }
}
