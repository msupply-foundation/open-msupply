use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
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
        "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        BEGIN;

        DROP VIEW invoice_line_stock_movement;
        CREATE VIEW invoice_line_stock_movement AS 
        SELECT 
            invoice_line.*,
            item_link.item_id as item_id,
            CASE
                WHEN type = 'STOCK_IN' THEN number_of_packs * pack_size
                WHEN type = 'STOCK_OUT' THEN number_of_packs * pack_size * -1
            END as quantity_movement
        FROM invoice_line
        JOIN item_link ON item_link.id = invoice_line.item_link_id
        WHERE number_of_packs > 0
        AND type IN ('STOCK_IN', 'STOCK_OUT');

        COMMIT;
        "#
    )?;

    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        BEGIN;

        DROP VIEW invoice_line_stock_movement;
        CREATE VIEW invoice_line_stock_movement AS 
        SELECT 
            invoice_line.*,
            item_link.item_id as item_id,
            CASE
                WHEN type = 'STOCK_IN' THEN (number_of_packs * pack_size)::BIGINT
                WHEN type = 'STOCK_OUT' THEN (number_of_packs * pack_size)::BIGINT * -1
            END as quantity_movement
        FROM invoice_line
        JOIN item_link ON item_link.id = invoice_line.item_link_id
        WHERE number_of_packs > 0
            AND type IN ('STOCK_IN', 'STOCK_OUT');

        COMMIT;
        "#
    )?;

    sql!(
        connection,
        r#"
        -- Dropping invoice_line.item_id and index
        DROP INDEX IF EXISTS index_invoice_line_item_id_fkey;
        ALTER TABLE invoice_line
        DROP COLUMN item_id;        
        "#,
    )?;

    Ok(())
}
