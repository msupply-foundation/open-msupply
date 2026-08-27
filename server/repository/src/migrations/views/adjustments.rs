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
        stock_movement.item_id AS item_id,
        stock_movement.store_id AS store_id,
        stock_movement.quantity AS quantity,
        date(stock_movement.datetime) AS date
    FROM stock_movement
    WHERE invoice_type='CUSTOMER_RETURN'
      OR invoice_type='SUPPLIER_RETURN'
      OR invoice_type='INVENTORY_ADDITION'
      OR invoice_type='INVENTORY_REDUCTION';
            "#
        )?;

        Ok(())
    }
}
