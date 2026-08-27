use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS inventory_adjustment_stock_movement;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW inventory_adjustment_stock_movement AS
    SELECT
        'n/a' as id,
        quantity_movement as quantity,
        item_id,
        store_id,
        verified_datetime as datetime
    FROM invoice_line_stock_movement
    JOIN invoice
        ON invoice_line_stock_movement.invoice_id = invoice.id
    WHERE invoice.type IN ('INVENTORY_REDUCTION', 'INVENTORY_ADDITION')
        AND verified_datetime IS NOT NULL;
            "#
        )?;

        Ok(())
    }
}
