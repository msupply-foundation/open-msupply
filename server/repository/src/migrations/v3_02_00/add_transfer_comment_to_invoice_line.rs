use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_transfer_comment_to_invoice_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Never filtered or sorted on, only displayed beside its line, so no
        // index. See `InvoiceLineRow::transfer_comment` for what it holds.
        sql!(
            connection,
            r#"
                ALTER TABLE invoice_line ADD COLUMN transfer_comment TEXT;
            "#
        )?;

        Ok(())
    }
}
