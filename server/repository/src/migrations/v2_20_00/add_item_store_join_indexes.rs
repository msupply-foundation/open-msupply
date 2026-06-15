use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_item_store_join_indexes"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // `item_store_join` only had a primary key on `id`; the foreign key
        // constraints don't create indexes on the referencing columns. The item
        // search/dropdown looks up store properties by (item_link_id, store_id)
        // for every item it lists, so without this index each lookup is a
        // sequential scan.
        sql!(
            connection,
            r#"
            CREATE INDEX IF NOT EXISTS index_item_store_join_item_link_id_store_id ON item_store_join (item_link_id, store_id);
            "#
        )?;

        Ok(())
    }
}
