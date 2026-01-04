// use util::sql_utc_datetime_as_local_date;

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

        // Make sure 'consumption' for the day is based on local date
        let utc_datetime_to_local_date = "date(stock_movement.datetime)";
        // sql_utc_datetime_as_local_date(cfg!(feature = "postgres"), "stock_movement.datetime");

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
                    {utc_datetime_to_local_date} AS date,
                    stock_movement.invoice_type AS invoice_type,
                    stock_movement.name_id AS name_id,
                    stock_movement.name_properties AS name_properties
            FROM (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
                LEFT OUTER JOIN stock_movement
                ON stock_movement.item_id = items_and_stores.item_id
                AND stock_movement.store_id = items_and_stores.store_id
            WHERE invoice_type='OUTBOUND_SHIPMENT' OR invoice_type='PRESCRIPTION';
            "#
        )?;

        Ok(())
    }
}
