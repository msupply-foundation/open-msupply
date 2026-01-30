use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "migrate_reason_option_ids"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let invoice_line_type = if cfg!(feature = "postgres") {
            "invoice_line_type"
        } else {
            "TEXT"
        };

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                INSERT INTO reason_option(id, type, reason) 
                SELECT 
                    id,
                    CASE
                        WHEN type = 'POSITIVE' THEN 'POSITIVE_INVENTORY_ADJUSTMENT'::reason_option_type
                        WHEN type = 'NEGATIVE' THEN 'NEGATIVE_INVENTORY_ADJUSTMENT'::reason_option_type
                    END as type,
                    reason
                FROM inventory_adjustment_reason
                WHERE type IN ('POSITIVE', 'NEGATIVE')
                UNION ALL
                SELECT 
                    id,
                    'RETURN_REASON'::reason_option_type as type,
                    reason
                FROM return_reason; 
                "#,
            )?;
        } else {
            sql!(
                connection,
                r#"
                INSERT INTO reason_option(id, type, reason) 
                SELECT 
                    id,
                    CASE
                        WHEN type = 'POSITIVE' THEN 'POSITIVE_INVENTORY_ADJUSTMENT'
                        WHEN type = 'NEGATIVE' THEN 'NEGATIVE_INVENTORY_ADJUSTMENT'
                    END as type,
                    reason
                FROM inventory_adjustment_reason
                WHERE type IN ('POSITIVE', 'NEGATIVE')
                UNION ALL
                SELECT 
                    id, 
                    'RETURN_REASON' as type,
                    reason
                FROM return_reason;                
                "#
            )?
        }

        sql!(
            connection,
            r#"
            ALTER TABLE stocktake_line ADD COLUMN reason_option_id TEXT REFERENCES reason_option(id);
            ALTER TABLE invoice_line ADD COLUMN reason_option_id TEXT REFERENCES reason_option(id);

            UPDATE invoice_line
            SET reason_option_id = inventory_adjustment_reason_id
            WHERE inventory_adjustment_reason_id IS NOT NULL;

            UPDATE invoice_line
            SET reason_option_id = return_reason_id
            WHERE return_reason_id IS NOT NULL;

            UPDATE stocktake_line
            SET reason_option_id = inventory_adjustment_reason_id
            WHERE inventory_adjustment_reason_id IS NOT NULL;
            "#,
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                ALTER TABLE invoice_line 
                DROP COLUMN inventory_adjustment_reason_id,
                DROP COLUMN return_reason_id;
                
                ALTER TABLE stocktake_line DROP COLUMN inventory_adjustment_reason_id;
                "#,
            )?
        } else {
            sql!(
                connection,
                r#"
                -- PRAGMA foreign_keys = OFF; -- No longer effective now that we're using transactions

                ALTER TABLE invoice_line RENAME TO invoice_line_old;

                CREATE TABLE invoice_line (
                    id TEXT NOT NULL PRIMARY KEY,
                    invoice_id TEXT NOT NULL REFERENCES invoice(id),
                    item_name TEXT NOT NULL,
                    item_code TEXT NOT NULL,
                    stock_line_id TEXT REFERENCES stock_line(id),
                    location_id TEXT REFERENCES location(id),
                    batch TEXT,
                    expiry_date {DATE},
                    cost_price_per_pack REAL NOT NULL,
                    sell_price_per_pack REAL NOT NULL,
                    total_before_tax REAL NOT NULL,
                    total_after_tax REAL NOT NULL,
                    tax_percentage REAL,
                    type {invoice_line_type} NOT NULL,
                    number_of_packs REAL NOT NULL,
                    pack_size REAL NOT NULL,
                    note TEXT,
                    foreign_currency_price_before_tax REAL,
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    item_variant_id TEXT REFERENCES item_variant(id),
                    prescribed_quantity REAL,
                    linked_invoice_id TEXT,
                    donor_id TEXT,
                    reason_option_id REFERENCES reason_option(id)
                );

                INSERT INTO invoice_line (
                    id,
                    invoice_id,
                    item_name,
                    item_code,
                    stock_line_id,
                    location_id,
                    batch,
                    expiry_date,
                    cost_price_per_pack,
                    sell_price_per_pack,
                    total_before_tax,
                    total_after_tax,
                    tax_percentage,
                    type,
                    number_of_packs,
                    pack_size,
                    note,
                    foreign_currency_price_before_tax,
                    item_link_id,
                    item_variant_id,
                    prescribed_quantity,
                    linked_invoice_id,
                    donor_id,
                    reason_option_id                
                )
                SELECT 
                    id,
                    invoice_id,
                    item_name,
                    item_code,
                    stock_line_id,
                    location_id,
                    batch,
                    expiry_date,
                    cost_price_per_pack,
                    sell_price_per_pack,
                    total_before_tax,
                    total_after_tax,
                    tax_percentage,
                    type,
                    number_of_packs,
                    pack_size,
                    note,
                    foreign_currency_price_before_tax,
                    item_link_id,
                    item_variant_id,
                    prescribed_quantity,
                    linked_invoice_id,
                    donor_id,
                    reason_option_id  
                FROM invoice_line_old;

                DROP TABLE invoice_line_old;

                ALTER TABLE stocktake_line RENAME TO stocktake_line_old;

                CREATE TABLE stocktake_line (
                    id TEXT NOT NULL PRIMARY KEY,
                    stocktake_id TEXT NOT NULL REFERENCES stocktake(id),
                    stock_line_id TEXT REFERENCES stock_line(id),
                    location_id TEXT REFERENCES location(id),
                    comment TEXT,
                    snapshot_number_of_packs REAL NOT NULL,
                    counted_number_of_packs REAL,
                    batch TEXT,
                    expiry_date {DATE},
                    pack_size REAL,
                    cost_price_per_pack REAL,
                    sell_price_per_pack REAL,
                    note TEXT,
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    item_name TEXT NOT NULL,
                    item_variant_id TEXT REFERENCES item_variant(id),
                    donor_link_id TEXT,
                    reason_option_id TEXT REFERENCES reason_option(id)
                );

                INSERT INTO stocktake_line (
                    id,
                    stocktake_id,
                    stock_line_id,
                    location_id,
                    comment,
                    snapshot_number_of_packs,
                    counted_number_of_packs,
                    batch,
                    expiry_date,
                    pack_size,
                    cost_price_per_pack,
                    sell_price_per_pack,
                    note,
                    item_link_id,
                    item_name,
                    item_variant_id,
                    donor_link_id,
                    reason_option_id          
                )
                SELECT 
                    id,
                    stocktake_id,
                    stock_line_id,
                    location_id,
                    comment,
                    snapshot_number_of_packs,
                    counted_number_of_packs,
                    batch,
                    expiry_date,
                    pack_size,
                    cost_price_per_pack,
                    sell_price_per_pack,
                    note,
                    item_link_id,
                    item_name,
                    item_variant_id,
                    donor_link_id,
                    reason_option_id  
                FROM stocktake_line_old;

                DROP TABLE stocktake_line_old;

                -- PRAGMA foreign_keys = ON;
                "#
            )?;
        }

        sql!(
            connection,
            r#"
                DROP TABLE inventory_adjustment_reason;
                DROP TABLE return_reason;

                UPDATE sync_buffer
                SET integration_datetime = NULL
                WHERE table_name = 'reason_option';   
                "#
        )?;

        Ok(())
    }
}
