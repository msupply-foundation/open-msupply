use crate::migrations::*;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
          DROP VIEW IF EXISTS consumption;
        "#
    )?;

    let absolute = if cfg!(feature = "postgres") {
        "@"
    } else {
        "abs"
    };

    sql!(
        connection,
        r#"
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
            WHERE invoice_type='OUTBOUND_SHIPMENT' OR invoice_type='PRESCRIPTION';

        CREATE VIEW replenishment AS
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
            WHERE invoice_type='INBOUND_SHIPMENT';

        CREATE VIEW adjustments AS
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
            WHERE invoice_type='INBOUND_RETURN'
              OR invoice_type='OUTBOUND_RETURN'
              OR invoice_type='INVENTORY_ADDITION'
              OR invoice_type='INVENTORY_REDUCTION';
        "#,
    )?;

    Ok(())
}
