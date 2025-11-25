use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS stock_movement;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
               CREATE VIEW stock_movement AS
    WITH all_movements AS (
      SELECT
        invoice_line_stock_movement.id AS id,
        quantity_movement AS quantity,
        invoice_line_stock_movement.item_id AS item_id,
        invoice.store_id as store_id,
        CASE WHEN invoice.type IN (
            'OUTBOUND_SHIPMENT', 'SUPPLIER_RETURN',
            'PRESCRIPTION'
        ) THEN picked_datetime
                    WHEN invoice.type IN (
            'INBOUND_SHIPMENT', 'CUSTOMER_RETURN'
        ) THEN received_datetime
                    WHEN invoice.type IN (
            'INVENTORY_ADDITION', 'INVENTORY_REDUCTION', 'REPACK'
        ) THEN verified_datetime
            END AS datetime,
        name,
        invoice.type AS invoice_type,
        invoice.invoice_number AS invoice_number,
        invoice.id AS invoice_id,
        invoice.linked_invoice_id AS linked_invoice_id,
        name.id AS name_id,
        name.properties AS name_properties,
        reason_option.reason AS reason,
        stock_line_id,
        invoice_line_stock_movement.expiry_date AS expiry_date,
        invoice_line_stock_movement.batch AS batch,
        invoice_line_stock_movement.cost_price_per_pack AS cost_price_per_pack,
        invoice_line_stock_movement.sell_price_per_pack AS sell_price_per_pack,
        invoice.status AS invoice_status,
        invoice_line_stock_movement.total_before_tax AS total_before_tax,
        invoice_line_stock_movement.pack_size as pack_size,
        invoice_line_stock_movement.number_of_packs as number_of_packs
    FROM
        invoice_line_stock_movement
        LEFT JOIN reason_option ON invoice_line_stock_movement.reason_option_id = reason_option.id
        LEFT JOIN stock_line ON stock_line.id = invoice_line_stock_movement.stock_line_id
        JOIN invoice ON invoice.id = invoice_line_stock_movement.invoice_id
        JOIN name_link ON invoice.name_link_id = name_link.id
        JOIN name ON name_link.name_id = name.id
    )
    SELECT * FROM all_movements
    WHERE datetime IS NOT NULL;
            "#
        )?;

        Ok(())
    }
}
