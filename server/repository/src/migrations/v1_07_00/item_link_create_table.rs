use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "item_link_create_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
        CREATE TABLE item_link (
            id TEXT NOT NULL PRIMARY KEY,
            item_id TEXT NOT NULL REFERENCES item(id)
        );
        CREATE INDEX "index_item_link_item_id_fkey" ON "item_link" ("item_id");
        INSERT INTO item_link SELECT id, id FROM item;
        "#,
        )?;

        Ok(())
    }
}
