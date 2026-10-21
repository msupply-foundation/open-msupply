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
                    totals.purchase_order_id,
                    totals.order_total_before_discount,
                    totals.order_total_before_discount - totals.supplier_discountable_total * (COALESCE(po.supplier_discount_percentage, 0) / 100) AS order_total_after_discount,
                    totals.supplier_discountable_total
                FROM (
                    SELECT
                        pol.purchase_order_id,
                        COALESCE(SUM(pol.line_total), 0) AS order_total_before_discount,
                        -- service lines take no supplier discount
                        COALESCE(SUM(CASE WHEN i.type = 'SERVICE' THEN 0 ELSE pol.line_total END), 0) AS supplier_discountable_total
                    FROM purchase_order_line pol
                    JOIN item_link il ON il.id = pol.item_link_id
                    JOIN item i ON i.id = il.item_id
                    GROUP BY pol.purchase_order_id
                ) totals
                JOIN purchase_order po ON po.id = totals.purchase_order_id;
            "#
        )?;

        Ok(())
    }
}
