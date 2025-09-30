use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS outbound_shipment_stock_movement;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                -- https://github.com/sussol/msupply/blob/master/Project/Sources/Methods/aggregator_stockMovement.4dm
  -- TODO are all of sc, ci, si type transactions synced, and are all of the dates set correctly ?
  CREATE VIEW outbound_shipment_stock_movement AS
    SELECT
        'n/a' as id,
        quantity_movement as quantity,
        item_id,
        store_id,
        picked_datetime as datetime
    FROM invoice_line_stock_movement
    JOIN invoice
        ON invoice_line_stock_movement.invoice_id = invoice.id
    WHERE invoice.type = 'OUTBOUND_SHIPMENT'
        AND picked_datetime IS NOT NULL;
            "#
        )?;

        Ok(())
    }
}
