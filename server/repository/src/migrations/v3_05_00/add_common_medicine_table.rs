use crate::migrations::*;

/// The medicines a store shows as cards on the Simple dispensing screen
/// (#2188), one row per medicine, in `sort_order`. Written at the store's own
/// site, so it is store data synced like any other, rather than a store
/// preference set on central. `amounts` holds the card's usual amounts, up to
/// three numbers as a JSON array, in the item's unit.
///
/// No unique (store, item) constraint: the service keeps each medicine once
/// per store, and an item merge can make two rows the same item anyway, which
/// the read resolves by keeping the first.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_common_medicine_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE common_medicine (
                    id TEXT NOT NULL PRIMARY KEY,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    sort_order INTEGER NOT NULL,
                    amounts TEXT NOT NULL DEFAULT '[]'
                );
                CREATE INDEX index_common_medicine_store_id
                    ON common_medicine (store_id);
                CREATE INDEX index_common_medicine_item_link_id
                    ON common_medicine (item_link_id);
            "#,
        )?;

        Ok(())
    }
}
