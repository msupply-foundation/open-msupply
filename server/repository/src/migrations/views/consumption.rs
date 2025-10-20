use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS consumption;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let absolute = if cfg!(feature = "postgres") {
            "@"
        } else {
            "abs"
        };

        sql!(
            connection,
            r#"
                -- https://github.com/sussol/msupply/blob/master/Project/Sources/Methods/aggregator_stockConsumption.4dm
  -- TODO sc type ?
  CREATE VIEW consumption AS
    SELECT
        'n/a' as id,
        items_and_stores.item_id AS item_id,
        items_and_stores.store_id AS store_id,
        {absolute}(COALESCE(stock_movement.quantity, 0)) AS quantity,
        date(stock_movement.datetime) AS date,
        CASE 
            WHEN stock_movement.linked_invoice_id IS NOT NULL AND stock_movement.invoice_type = 'OUTBOUND_SHIPMENT'
            THEN true 
            ELSE false 
        END AS is_transfer
    FROM
        (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
    LEFT OUTER JOIN stock_movement
        ON stock_movement.item_id = items_and_stores.item_id
            AND stock_movement.store_id = items_and_stores.store_id
    WHERE invoice_type='OUTBOUND_SHIPMENT' OR invoice_type='PRESCRIPTION';
            "#
        )?;

        Ok(())
    }
}
