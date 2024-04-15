use crate::migrations::*;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
    DROP VIEW IF EXISTS stock_movement;

    CREATE VIEW stock_movement AS
    WITH all_movements AS (
        SELECT
            invoice_line_stock_movement.id AS id,
            quantity_movement AS quantity,
            item_link_id AS item_id,
            store_id,
            CASE WHEN invoice.type IN (
                'OUTBOUND_SHIPMENT', 'OUTBOUND_RETURN',
                'PRESCRIPTION'
            ) THEN picked_datetime
                        WHEN invoice.type IN (
                'INBOUND_SHIPMENT', 'INBOUND_RETURN'
            ) THEN delivered_datetime
                        WHEN invoice.type IN (
                'INVENTORY_ADDITION', 'INVENTORY_REDUCTION'
            ) THEN verified_datetime
                END AS datetime,
            name,
            invoice.type AS invoice_type,
            inventory_adjustment_reason.reason as inventory_adjustment_reason,
            return_reason.reason as return_reason,
            stock_line_id
        FROM
            invoice_line_stock_movement
            LEFT JOIN inventory_adjustment_reason ON invoice_line_stock_movement.inventory_adjustment_reason_id = inventory_adjustment_reason.id
            LEFT JOIN return_reason ON invoice_line_stock_movement.return_reason_id = return_reason.id
            JOIN invoice ON invoice.id = invoice_line_stock_movement.invoice_id
            JOIN name_link ON invoice.name_link_id = name_link.id
            JOIN name ON name_link.name_id = name.id
    )
    SELECT * FROM all_movements
    WHERE datetime IS NOT NULL;
        "#,
    )?;

    Ok(())
}
