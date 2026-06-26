use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_stock_line_store_on_hand_index"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Stock-on-hand is computed by the `store_items` / `store_stock_on_hand`
        // views, which aggregate `stock_line` for a store grouped by item
        // (`SUM(pack_size * ..._number_of_packs)`). This drives both the
        // `isVisibleOrOnHand` / `hasStockOnHand` item-search filter and the
        // `ItemNode.stockOnHand` field shown for every listed item.
        //
        // `stock_line` only had single-column foreign-key indexes, so the
        // aggregation forced SQLite to build an AUTOMATIC ephemeral index on
        // every call (plus a TEMP B-TREE for the GROUP BY). On a store holding
        // all of a site's stock lines this took seconds per keystroke on
        // low-powered tablets.
        //
        // This covering index lets the aggregation seek by `store_id`, read
        // `item_link_id` and the pack columns straight from the index, and group
        // without touching the table — measured ~280x faster on a real device db.
        sql!(
            connection,
            r#"
            CREATE INDEX IF NOT EXISTS index_stock_line_store_id_item_link_id_on_hand
                ON stock_line (store_id, item_link_id, available_number_of_packs, total_number_of_packs, pack_size);
            "#
        )?;

        Ok(())
    }
}
