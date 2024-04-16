mod invoice;
mod invoice_line;
mod name;
mod report;
mod requisition;
mod stocktake;

use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    // First remove views
    sql!(
        connection,
        r#"
            DROP VIEW invoice_stats;
            DROP VIEW consumption;
            DROP VIEW stock_movement;
            DROP VIEW inventory_adjustment_stock_movement;
            DROP VIEW inbound_shipment_stock_movement;
            DROP VIEW outbound_shipment_stock_movement;
            DROP VIEW invoice_line_stock_movement;
        "#
    )?;

    report::migrate(connection)?;
    requisition::migrate(connection)?;
    stocktake::migrate(connection)?;
    name::migrate(connection)?;
    invoice_line::migrate(connection)?;
    invoice::migrate(connection)?;

    // Re create views
    sql!(
        connection,
        r#"
            CREATE VIEW invoice_stats AS
            SELECT
                invoice_line.invoice_id,
                SUM(invoice_line.total_before_tax) AS total_before_tax,
                SUM(invoice_line.total_after_tax) AS total_after_tax,
                (SUM(invoice_line.total_after_tax) / SUM(invoice_line.total_before_tax) - 1) * 100 AS tax_percentage,
                COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_before_tax,
                COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_after_tax,
                COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0)  AS stock_total_before_tax,
                COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0)  AS stock_total_after_tax
            FROM
                invoice_line
            GROUP BY
                invoice_line.invoice_id;

            CREATE VIEW invoice_line_stock_movement AS 
            SELECT 
                *,
                CASE
                    WHEN type = 'STOCK_IN' THEN number_of_packs * pack_size
                    WHEN type = 'STOCK_OUT' THEN number_of_packs * pack_size * -1
                END as quantity_movement
            FROM invoice_line
            WHERE number_of_packs > 0
                AND type IN ('STOCK_IN', 'STOCK_OUT');
            
            -- https://github.com/sussol/msupply/blob/master/Project/Sources/Methods/aggregator_stockMovement.4dm
            -- TODO are all of sc, ci, si type transactions synced, and are all of the dates set correctly ?
            CREATE VIEW outbound_shipment_stock_movement AS
            SELECT 
                'n/a' as id,
                quantity_movement as quantity,
                item_id,
                store_id,
                picked_datetime as datetime
            FROM invoice_line_stock_movement 
            JOIN invoice
                ON invoice_line_stock_movement.invoice_id = invoice.id
            WHERE invoice.type = 'OUTBOUND_SHIPMENT' 
                AND picked_datetime IS NOT NULL;
                    
            CREATE VIEW inbound_shipment_stock_movement AS
            SELECT 
                'n/a' as id,
                quantity_movement as quantity,
                item_id,
                store_id,
                delivered_datetime as datetime
            FROM invoice_line_stock_movement 
            JOIN invoice
                ON invoice_line_stock_movement.invoice_id = invoice.id
            WHERE invoice.type = 'INBOUND_SHIPMENT' 
                AND delivered_datetime IS NOT NULL;
                    
            CREATE VIEW inventory_adjustment_stock_movement AS
            SELECT 
                'n/a' as id,
                quantity_movement as quantity,
                item_id,
                store_id,
                verified_datetime as datetime
            FROM invoice_line_stock_movement 
            JOIN invoice
                ON invoice_line_stock_movement.invoice_id = invoice.id
            WHERE invoice.type = 'INVENTORY_ADJUSTMENT' 
                AND verified_datetime IS NOT NULL;
                    
            CREATE VIEW stock_movement AS
            SELECT * FROM outbound_shipment_stock_movement
            UNION SELECT * from inbound_shipment_stock_movement
            UNION SELECT * from inventory_adjustment_stock_movement;
            
            -- https://github.com/sussol/msupply/blob/master/Project/Sources/Methods/aggregator_stockConsumption.4dm
            -- TODO sc type ?
            CREATE VIEW consumption AS
            SELECT 
                'n/a' as id,
                items_and_stores.item_id AS item_id, 
                items_and_stores.store_id AS store_id,
                abs(COALESCE(stock_movement.quantity, 0)) AS quantity,
                date(stock_movement.datetime) AS date
            FROM
                (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
            LEFT OUTER JOIN outbound_shipment_stock_movement as stock_movement
                ON stock_movement.item_id = items_and_stores.item_id 
                    AND stock_movement.store_id = items_and_stores.store_id;
        "#
    )?;

    Ok(())
}

#[cfg(test)]
async fn setup_data_migration(name: &str) -> StorageConnection {
    use crate::{
        migrations::{templates::add_data_from_sync_buffer::V1_00_08, Migration},
        test_db::*,
    };

    // Migrate to version - 1
    let SetupResult { mut connection, .. } = setup_test(SetupOption {
        db_name: name,
        version: Some(V1_00_08.version()),
        ..Default::default()
    })
    .await;
    // Common data
    sql!(
        &mut connection,
        r#"
        INSERT INTO name 
        (id, type, is_customer, is_supplier, code, name) 
        VALUES 
        ('name_id', 'STORE', false, false, '', '');
    "#
    )
    .unwrap();

    sql!(
        &mut connection,
        r#"
        INSERT INTO store 
        (id, name_id, site_id, code) 
        VALUES 
        ('store_id', 'name_id', 1, '');
    "#
    )
    .unwrap();
    connection
}
