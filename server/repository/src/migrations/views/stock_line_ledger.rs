use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS stock_line_ledger;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                -- Separate views for stock & item ledger, so the running balance window functions are only executed when required

  CREATE VIEW stock_line_ledger AS
    WITH movements_with_precedence AS (
      SELECT *,
        CASE
          WHEN invoice_type IN ('INBOUND_SHIPMENT', 'CUSTOMER_RETURN', 'INVENTORY_ADDITION') THEN 1
          WHEN invoice_type IN ('OUTBOUND_SHIPMENT', 'SUPPLIER_RETURN', 'PRESCRIPTION', 'INVENTORY_REDUCTION') THEN 2
          ELSE 3
        END AS type_precedence
      FROM stock_movement
      WHERE stock_line_id IS NOT NULL
    )
    SELECT *,
      SUM(quantity) OVER (
        PARTITION BY store_id, stock_line_id
        ORDER BY datetime, type_precedence
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS running_balance
    FROM movements_with_precedence
    ORDER BY datetime, type_precedence;
            "#
        )?;

        Ok(())
    }
}
