use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS store_stock_on_hand;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Aggregate stock_line directly, then join item once for the name. This lets
        // SQLite push the store_id filter into the stock_line index and group in a
        // single pass, so cost scales with the number of stock lines, not items x stores.
        //
        // The previous version joined the store_items view and grouped by item, which
        // made SQLite re-scan the store's stock for every item - around 100x slower for
        // the common item-search case (#10914).
        //
        // NOTE: only items that have stock (available or total > 0) appear here, so
        // callers must default missing items to 0.
        sql!(
            connection,
            r#"
                CREATE VIEW store_stock_on_hand AS
    SELECT
      'n/a' AS id,
      item.id AS item_id,
      item.name AS item_name,
      stock.store_id AS store_id,
      stock.available_stock_on_hand AS available_stock_on_hand,
      stock.total_stock_on_hand AS total_stock_on_hand
    FROM
      (
        SELECT
          item_link.item_id AS item_id,
          stock_line.store_id AS store_id,
          COALESCE(SUM(stock_line.pack_size * stock_line.available_number_of_packs), 0) AS available_stock_on_hand,
          COALESCE(SUM(stock_line.pack_size * stock_line.total_number_of_packs), 0) AS total_stock_on_hand
        FROM
          stock_line
          JOIN item_link ON item_link.id = stock_line.item_link_id
        WHERE
          stock_line.available_number_of_packs > 0 OR stock_line.total_number_of_packs > 0
        GROUP BY
          item_link.item_id,
          stock_line.store_id
      ) AS stock
      JOIN item ON item.id = stock.item_id;
            "#
        )?;

        Ok(())
    }
}
