use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS replenishment;
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
                CREATE VIEW replenishment AS
    SELECT
        'n/a' as id,
        stock_movement.item_id AS item_id,
        stock_movement.store_id AS store_id,
        {absolute}(COALESCE(stock_movement.quantity, 0)) AS quantity,
        date(stock_movement.datetime) AS date
    FROM stock_movement
    WHERE invoice_type='INBOUND_SHIPMENT';            "#
        )?;

        Ok(())
    }
}
