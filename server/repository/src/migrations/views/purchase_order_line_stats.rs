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
                    COALESCE(SUM(il.number_of_packs * il.pack_size), 0) AS shipped_number_of_units,
                    COALESCE(SUM(CASE WHEN i.status in ('SHIPPED', 'DELIVERED') THEN il.number_of_packs * il.pack_size ELSE 0 END), 0) AS in_transit_number_of_units,
                    COALESCE(SUM(CASE WHEN i.status in ('RECEIVED', 'VERIFIED') THEN il.number_of_packs * il.pack_size ELSE 0 END), 0) AS received_number_of_units
                FROM
                    purchase_order_line pol
                        LEFT JOIN (
                            invoice_line il
                                JOIN invoice i on i.id = il.invoice_id
                        ) on il.purchase_order_line_id = pol.id
                            AND il.type = 'STOCK_IN' -- doesn't count any rejected lines as they will have been converted to unallocated stock lines
                            AND i.status in ('SHIPPED', 'DELIVERED', 'RECEIVED', 'VERIFIED') -- count all statuses after shipped
                GROUP BY
                    pol.id;
            "#
        )?;

        Ok(())
    }
}
