use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_store_name_link_id_index"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // store.name_link_id has had no index since 2.1.0, when it replaced name_id.
        // Every StoreRepository query joins name_link on it.
        sql!(
            connection,
            r#"
            CREATE INDEX IF NOT EXISTS index_store_name_link_id_fkey
                ON store (name_link_id);
            "#
        )?;

        Ok(())
    }
}
