use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
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
