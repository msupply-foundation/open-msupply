use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_purchase_order_line_id_to_invoice_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE invoice_line ADD COLUMN purchase_order_line_id TEXT REFERENCES purchase_order_line(id);
            "#
        )?;

        // Backfill from the existing item-based matching logic
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    UPDATE invoice_line il
                    SET purchase_order_line_id = pol.id
                    FROM invoice i
                    JOIN item_link il_item_link ON il_item_link.id = il.item_link_id
                    JOIN purchase_order_line pol ON i.purchase_order_id = pol.purchase_order_id
                    JOIN item_link pol_item_link ON pol_item_link.id = pol.item_link_id
                        AND il_item_link.item_id = pol_item_link.item_id
                    WHERE il.invoice_id = i.id
                        AND i.purchase_order_id IS NOT NULL;
                "#
            )?;
        } else {
            sql!(
                connection,
                r#"
                    UPDATE invoice_line
                    SET purchase_order_line_id = (
                        SELECT pol.id
                        FROM invoice i
                        JOIN item_link il_item_link ON il_item_link.id = invoice_line.item_link_id
                        JOIN purchase_order_line pol ON i.purchase_order_id = pol.purchase_order_id
                        JOIN item_link pol_item_link ON pol_item_link.id = pol.item_link_id
                            AND il_item_link.item_id = pol_item_link.item_id
                        WHERE invoice_line.invoice_id = i.id
                            AND i.purchase_order_id IS NOT NULL
                    )
                    WHERE EXISTS (
                        SELECT 1 FROM invoice i
                        WHERE invoice_line.invoice_id = i.id
                            AND i.purchase_order_id IS NOT NULL
                    );
                "#
            )?;
        }

        Ok(())
    }
}
