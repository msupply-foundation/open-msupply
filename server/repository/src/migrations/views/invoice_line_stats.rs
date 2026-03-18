use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS invoice_line_stats;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW invoice_line_stats AS
                SELECT
                    il.id AS invoice_line_id,
                    pol.id AS purchase_order_line_id
                FROM
                    invoice_line il
                        JOIN invoice i ON il.invoice_id = i.id
                        JOIN item_link il_item_link ON il_item_link.id = il.item_link_id
                        LEFT JOIN (
                            purchase_order_line pol
                                JOIN item_link pol_item_link ON pol_item_link.id = pol.item_link_id
                        ) ON i.purchase_order_id = pol.purchase_order_id
                            AND il_item_link.item_id = pol_item_link.item_id
            "#
        )?;

        Ok(())
    }
}
