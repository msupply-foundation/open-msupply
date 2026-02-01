use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS purchase_order_line_stats;
            "#
        )?;

        Ok(())
    }

    // TODO: name_link join?
    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW purchase_order_line_stats AS
                SELECT
                    pol.id as purchase_order_line_id,
                    COALESCE(SUM(il.number_of_packs * il.pack_size), 0) AS shipped_quantity
                FROM
                    purchase_order_line pol
                        LEFT JOIN invoice i on pol.purchase_order_id = i.purchase_order_id
                        LEFT JOIN invoice_line il on i.id = il.invoice_id
                            AND pol.item_link_id = il.item_link_id
                            AND il.type = 'STOCK_IN'
                            AND i.status in ('SHIPPED', 'DELIVERED', 'RECEIVED', 'VERIFIED') -- count all statuses after shipped
                GROUP BY
                    pol.id;
            "#
        )?;

        Ok(())
    }
}
