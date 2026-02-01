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

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW purchase_order_line_stats AS
                SELECT
                    pol.id as purchase_order_line_id,
                    COALESCE(SUM(il.number_of_packs * il.pack_size), 0) AS shipped_number_of_units
                FROM
                    purchase_order_line pol
                        LEFT JOIN invoice i on pol.purchase_order_id = i.purchase_order_id
                        JOIN item_link pol_item_link on pol_item_link.id = pol.item_link_id
                        LEFT JOIN (
                            -- want to join this before the left join so we get a stats row for each pol even if no matching il
                            invoice_line il
                                JOIN item_link il_item_link on il_item_link.id = il.item_link_id
                        ) on i.id = il.invoice_id
                            AND il_item_link.id = pol_item_link.id
                            AND il.type = 'STOCK_IN'
                            AND i.status in ('SHIPPED', 'DELIVERED', 'RECEIVED', 'VERIFIED') -- count all statuses after shipped
                GROUP BY
                    pol.id;
            "#
        )?;

        Ok(())
    }
}
