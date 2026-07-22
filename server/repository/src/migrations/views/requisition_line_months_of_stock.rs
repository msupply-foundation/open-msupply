use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS requisition_line_months_of_stock;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW requisition_line_months_of_stock AS
                SELECT
                    rl.id AS requisition_line_id,
                    CASE
                        WHEN rl.average_monthly_consumption = 0 AND rl.available_stock_on_hand = 0 THEN 0
                        WHEN rl.average_monthly_consumption = 0 THEN NULL
                        ELSE rl.available_stock_on_hand / rl.average_monthly_consumption
                    END AS months_of_stock
                FROM
                    requisition_line_view rl;
            "#
        )?;

        Ok(())
    }
}
