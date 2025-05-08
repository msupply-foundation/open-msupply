use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "migrate_reason_option_ids
"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            INSERT INTO reason_option(id, type) 
            SELECT 
                id,
                CASE
                    WHEN type = 'POSITIVE' THEN 'POSITIVE_INVENTORY_ADJUSTMENT'::reason_option_type
                    WHEN type = 'NEGATIVE' THEN 'NEGATIVE_INVENTORY_ADJUSTMENT'::reason_option_type
                END as type
            FROM inventory_adjustment_reason
            WHERE type IN ('POSITIVE', 'NEGATIVE')
            UNION ALL
            SELECT id, 'RETURN_REASON'::reason_option_type as type
            FROM return_reason;         

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

            ALTER TABLE invoice_line 
            DROP COLUMN inventory_adjustment_reason_id,
            DROP COLUMN return_reason_id;

            ALTER TABLE stocktake_line DROP COLUMN inventory_adjustment_reason_id;

            UPDATE sync_buffer
            SET integration_datetime = NULL
            WHERE table_name = 'reason_option';   
            "#
        )?;

        Ok(())
    }
}
