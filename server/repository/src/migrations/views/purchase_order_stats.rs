use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS purchase_order_stats;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW purchase_order_stats AS
        SELECT
            po.id AS purchase_order_id,
            COALESCE(SUM(
                CASE
                    WHEN pol.adjusted_number_of_units IS NOT NULL
                    THEN pol.adjusted_number_of_units * pol.price_per_unit_before_discount
                    ELSE pol.requested_number_of_units * pol.price_per_unit_before_discount
                END
            ), 0) AS line_total_before_discount,
            COALESCE(SUM(
                CASE
                    WHEN pol.adjusted_number_of_units IS NOT NULL
                    THEN pol.adjusted_number_of_units * pol.price_per_unit_after_discount
                    ELSE pol.requested_number_of_units * pol.price_per_unit_after_discount
                END

            ), 0) AS line_total_after_discount,
            COALESCE(SUM(
                CASE
                    WHEN pol.adjusted_number_of_units IS NOT NULL
                    THEN pol.adjusted_number_of_units * pol.price_per_unit_after_discount
                    ELSE pol.requested_number_of_units * pol.price_per_unit_after_discount
                END
            ), 0) * (1-(COALESCE(po.supplier_discount_percentage, 0)/100)) AS order_total_after_discount
        FROM
            purchase_order po JOIN purchase_order_line pol on po.id = pol.purchase_order_id
        GROUP BY
            po.id;
            "#
        )?;

        Ok(())
    }
}
