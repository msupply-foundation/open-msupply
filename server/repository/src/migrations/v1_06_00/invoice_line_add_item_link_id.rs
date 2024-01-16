use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Drop affected views
    sql!(
        &connection,
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

    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        -- Adding invoice_line.item_link_id
        ALTER TABLE invoice_line
        ADD COLUMN item_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';
        
        UPDATE invoice_line
        SET item_link_id = item_id;
        
        ALTER TABLE invoice_line ADD CONSTRAINT invoice_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES item_link(id);
        CREATE INDEX "index_invoice_line_item_link_id_fkey" on "invoice_line" (item_link_id);

        -- Dropping invoice_line.item_id and index
        DROP INDEX index_invoice_line_item_id_fkey;
        ALTER TABLE invoice_line
        DROP COLUMN item_id;   

        CREATE VIEW invoice_stats AS
        SELECT
            invoice_line.invoice_id,
            SUM(invoice_line.total_before_tax) AS total_before_tax,
            SUM(invoice_line.total_after_tax) AS total_after_tax,
            COALESCE((SUM(invoice_line.total_after_tax) / NULLIF(SUM(invoice_line.total_before_tax),0) - 1), 0) * 100 AS tax_percentage,
            COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_before_tax,
            COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_after_tax,
            COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0)  AS stock_total_before_tax,
            COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0)  AS stock_total_after_tax
        FROM
            invoice_line
        GROUP BY
            invoice_line.invoice_id;
        "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        -- Adding invoice_line.item_link_id
        -- Disable foreign key checks to avoid firing constraints on adding new FK column (SQLite)
        PRAGMA foreign_keys = OFF;
            
        ALTER TABLE invoice_line
        ADD COLUMN item_link_id TEXT NOT NULL REFERENCES item_link (id) DEFAULT 'temp_for_migration'; -- Can't have NOT NULL without a default... no PRAGMA for turning constraints off!
        CREATE INDEX "index_invoice_line_item_link_id_fkey" on "invoice_line" (item_link_id);
        
        UPDATE invoice_line
        SET
        item_link_id = item_id;
        
        PRAGMA foreign_keys = ON;

        -- Dropping invoice_line.item_id and index
        DROP INDEX index_invoice_line_item_id_fkey;
        ALTER TABLE invoice_line
        DROP COLUMN item_id;   

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
        "#,
    )?;

    let (casting, absolute) = if cfg!(feature = "postgres") {
        ("::BIGINT", "@")
    } else {
        ("", "abs")
    };

    // Recreate views
    sql!(
        &connection,
        r#"
            CREATE VIEW invoice_line_stock_movement AS 
            SELECT
                invoice_line.*,
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
            WHERE invoice.type IN ('INVENTORY_REDUCTION', 'INVENTORY_ADDITION') 
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
                {absolute}(COALESCE(stock_movement.quantity, 0)) AS quantity,
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
