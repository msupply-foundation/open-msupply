use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_item_store_join"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE item_store_join (
                    id TEXT NOT NULL PRIMARY KEY,
                    item_link_id TEXT NOT NULL REFERENCES item_link (id),
                    store_id TEXT NOT NULL REFERENCES store (id),
                    default_sell_price_per_pack {DOUBLE} NOT NULL
                );
            "#
        )?;

        Ok(())
    }
}
