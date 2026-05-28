use crate::migrations::*;
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_linked_invoice_line_id_to_invoice_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE invoice_line ADD COLUMN linked_invoice_line_id TEXT;
            "#
        )?;

        sql!(
            connection,
            r#"
                UPDATE sync_buffer
                    SET integration_datetime = NULL
                    WHERE table_name = 'trans_line';
            "#
        )?;

        Ok(())
    }
}
