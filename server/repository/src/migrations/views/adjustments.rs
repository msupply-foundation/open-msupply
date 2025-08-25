use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS adjustments;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE VIEW adjustments AS
    SELECT
        'n/a' as id,
        items_and_stores.item_id AS item_id,
        items_and_stores.store_id AS store_id,
        stock_movement.quantity AS quantity,
        date(stock_movement.datetime) AS date
    FROM
        (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
    LEFT OUTER JOIN stock_movement
        ON stock_movement.item_id = items_and_stores.item_id
            AND stock_movement.store_id = items_and_stores.store_id
    WHERE invoice_type='CUSTOMER_RETURN'
      OR invoice_type='SUPPLIER_RETURN'
      OR invoice_type='INVENTORY_ADDITION'
      OR invoice_type='INVENTORY_REDUCTION';
            "#
        )?;

        Ok(())
    }
}
