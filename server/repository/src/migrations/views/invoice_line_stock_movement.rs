use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS invoice_line_stock_movement;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW invoice_line_stock_movement AS
    SELECT
        invoice_line.id,
        invoice_line.invoice_id,
        invoice_line.item_name,
        invoice_line.item_code,
        invoice_line.stock_line_id,
        invoice_line.location_id,
        invoice_line.batch,
        invoice_line.expiry_date,
        invoice_line.cost_price_per_pack,
        invoice_line.sell_price_per_pack,
        invoice_line.total_before_tax,
        invoice_line.total_after_tax,
        invoice_line.tax_percentage,
        invoice_line.number_of_packs,
        invoice_line.pack_size,
        invoice_line.note,
        invoice_line.type,
        invoice_line.reason_option_id,
        invoice_line.foreign_currency_price_before_tax,
        invoice_line.item_link_id,
        item_link.item_id AS item_id,
        CASE
            WHEN "type" = 'STOCK_IN' THEN (number_of_packs * pack_size)
            WHEN "type" = 'STOCK_OUT' THEN (number_of_packs * pack_size) * -1
        END AS quantity_movement
    FROM
        invoice_line
        JOIN item_link ON item_link.id = invoice_line.item_link_id
    WHERE
        number_of_packs > 0
        AND "type" IN ('STOCK_IN', 'STOCK_OUT');

            "#
        )?;

        Ok(())
    }
}
