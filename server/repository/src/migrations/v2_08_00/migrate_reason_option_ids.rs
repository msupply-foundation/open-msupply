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
            ADD CONSTRAINT invoice_line_reason_fkey
            FOREIGN KEY (reason_option_id)
            REFERENCES reason_option(id);

            ALTER TABLE stocktake_line
            ADD CONSTRAINT stocktake_line_reason_fkey
            FOREIGN KEY (reason_option_id)
            REFERENCES reason_option(id);
            "#
        )?;

        Ok(())
    }
}
