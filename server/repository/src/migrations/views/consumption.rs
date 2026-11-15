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
                    stock_movement.item_id AS item_id,
                    stock_movement.store_id AS store_id,
                    {absolute}(COALESCE(stock_movement.quantity, 0)) AS quantity,
                    {utc_datetime_to_local_date} AS date,
                    stock_movement.invoice_type AS invoice_type,
                    stock_movement.name_id AS name_id,
                    stock_movement.name_properties AS name_properties,
                    false AS is_estimate
            FROM stock_movement
            WHERE invoice_type='OUTBOUND_SHIPMENT' OR invoice_type='PRESCRIPTION'

            -- Estimated consumption for a store without history of its own
            -- (consumption_estimate), added on top of the real thing. Each row
            -- is a week-long piece of an estimate, dated at its midpoint, and
            -- reads as the store issuing to itself.
            UNION ALL
            SELECT
                    'n/a' as id,
                    item_link.item_id AS item_id,
                    consumption_estimate.store_id AS store_id,
                    consumption_estimate.quantity AS quantity,
                    consumption_estimate.date AS date,
                    'OUTBOUND_SHIPMENT' AS invoice_type,
                    name.id AS name_id,
                    name.properties AS name_properties,
                    true AS is_estimate
            FROM consumption_estimate
            JOIN item_link ON item_link.id = consumption_estimate.item_link_id
            JOIN store ON store.id = consumption_estimate.store_id
            JOIN name_link ON name_link.id = store.name_link_id
            JOIN name ON name.id = name_link.name_id;
            "#
        )?;

        Ok(())
    }
}
