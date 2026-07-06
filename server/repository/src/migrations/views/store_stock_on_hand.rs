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
        sql!(
            connection,
            r#"
                CREATE VIEW store_stock_on_hand AS
    SELECT
      'n/a' AS id,
      item.id AS item_id,
      item.name AS item_name,
      si.store_id AS store_id,
      COALESCE(SUM(si.pack_size * si.available_number_of_packs), 0) AS available_stock_on_hand,
      COALESCE(SUM(si.pack_size * si.total_number_of_packs), 0) AS total_stock_on_hand
    FROM
      item
      INNER JOIN store_items si ON si.item_id = item.id
    WHERE
      si.available_number_of_packs > 0 OR si.total_number_of_packs > 0
    GROUP BY
      item.id,
      item.name,
      si.store_id;
            "#
        )?;

        Ok(())
    }
}
