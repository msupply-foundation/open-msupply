use crate::migrations::*;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    let (casting, absolute) = if cfg!(feature = "postgres") {
        ("::BIGINT", "@")
    } else {
        ("", "abs")
    };

    // Drop all these views, then re-create only the required ones:
    // - invoice_line_stock_movement (now explicitly stating all column names,
    //   rather than *)
    // - stock_movement (references above, replaces the individual (outbound,
    //   inbound, etc) views)
    // - consumption (same as previous, but with restriction to invoice type
    //   rather than referencing specific outbound_shipment view)
    sql!(
        connection,
        r#"
    DROP VIEW IF EXISTS consumption;
    DROP VIEW IF EXISTS stock_movement;
    DROP VIEW IF EXISTS outbound_shipment_stock_movement;
    DROP VIEW IF EXISTS inbound_shipment_stock_movement;
    DROP VIEW IF EXISTS inventory_adjustment_stock_movement;
    DROP VIEW IF EXISTS invoice_line_stock_movement;

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
                invoice_line.inventory_adjustment_reason_id,
                invoice_line.foreign_currency_price_before_tax,
                invoice_line.item_link_id,
                invoice_line.return_reason_id,
                item_link.item_id AS item_id,
                CASE
                    WHEN "type" = 'STOCK_IN' THEN (number_of_packs * pack_size){casting}
                    WHEN "type" = 'STOCK_OUT' THEN (number_of_packs * pack_size){casting} * -1
                END AS quantity_movement
            FROM
                invoice_line
                JOIN item_link ON item_link.id = invoice_line.item_link_id
            WHERE
                number_of_packs > 0
                AND "type" IN ('STOCK_IN', 'STOCK_OUT');

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
                'INVENTORY_ADDITION', 'INVENTORY_REDUCTION', 'REPACK'
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

    CREATE VIEW consumption AS
            SELECT
                'n/a' as id,
                items_and_stores.item_id AS item_id,
                items_and_stores.store_id AS store_id,
                {absolute}(COALESCE(stock_movement.quantity, 0)) AS quantity,
                date(stock_movement.datetime) AS date
            FROM
                (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
            LEFT OUTER JOIN stock_movement
                ON stock_movement.item_id = items_and_stores.item_id
                    AND stock_movement.store_id = items_and_stores.store_id
            WHERE invoice_type='OUTBOUND_SHIPMENT';
        "#,
    )?;

    Ok(())
}
